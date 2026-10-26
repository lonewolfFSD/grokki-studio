"""
Grokki Spatial AI Daemon (MediaPipe AI Python Engine)
Features:
1. AIR-CURSOR SPATIAL CONTROL (Minority Report / VisionOS style):
   - Smooth 3D Index Fingertip Tracking mapped to Windows Desktop with adaptive EMA smoothing
   - Pinch Thumb + Index: Left Click & Drag (Native mouse_event)
   - Pinch Thumb + Middle: Right Click (Context Menu)
   - 2 Fingers Up (Index + Middle vertical): Smooth Mouse Wheel Scrolling
   - Fist / Rest: Automatic Park & Release (Zero accidental clicks)
2. PRESENTATION MODE:
   - 2 Fingers (Index + Middle extended): NEXT SLIDE (Right Arrow)
   - 3 Fingers (Index + Middle + Ring): PREVIOUS SLIDE (Left Arrow)
   - Hold 5 Fingers (Open Palm): BLANK SCREEN ('b' key)
3. THREAD-SAFE INSTANT SHUTDOWN:
   - Clean hardware release on main thread in <40ms
"""
import sys
import os
import json
import time
import signal
import threading
import argparse
import cv2
import numpy as np
import mediapipe as mp

# Win32 Native Cursor API
try:
    import ctypes
    import ctypes.wintypes
    user32 = ctypes.windll.user32
    SCREEN_WIDTH = user32.GetSystemMetrics(0)
    SCREEN_HEIGHT = user32.GetSystemMetrics(1)
    HAS_WIN32 = True
except Exception:
    HAS_WIN32 = False
    SCREEN_WIDTH, SCREEN_HEIGHT = 1920, 1080

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "hand_landmarker.task")
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = os.path.abspath("hand_landmarker.task")

# Operating mode: 'presentation' or 'air_cursor'
current_mode = "presentation"
stop_requested = False

def log_event(data):
    try:
        sys.stdout.write(json.dumps(data) + "\n")
        sys.stdout.flush()
    except Exception:
        pass

def stdin_listener():
    """Reads stdin continuously for mode changes or clean stop."""
    global current_mode, stop_requested
    try:
        for line in sys.stdin:
            trimmed = line.strip()
            if not trimmed:
                continue
            lower = trimmed.lower()
            if lower in ("stop", "exit", "quit", "close"):
                stop_requested = True
                break
            if trimmed.startswith("{"):
                try:
                    payload = json.loads(trimmed)
                    if payload.get("cmd") == "set_mode":
                        new_mode = payload.get("mode", "presentation")
                        current_mode = new_mode
                        log_event({"type": "mode_changed", "mode": current_mode})
                    elif payload.get("cmd") == "stop":
                        stop_requested = True
                        break
                except Exception:
                    pass
    except Exception:
        pass
    stop_requested = True

def sig_handler(signum, frame):
    global stop_requested
    stop_requested = True

try:
    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)
except Exception:
    pass

def is_finger_extended(hand, tip_idx, pip_idx):
    wrist = hand[0]
    tip = hand[tip_idx]
    pip = hand[pip_idx]

    dist_tip_wrist = np.hypot(tip.x - wrist.x, tip.y - wrist.y)
    dist_pip_wrist = np.hypot(pip.x - wrist.x, pip.y - wrist.y)

    is_upright = tip.y < pip.y
    has_reach = dist_tip_wrist > (dist_pip_wrist * 1.08)

    return is_upright and has_reach

def classify_fingers(hand):
    index_up = is_finger_extended(hand, 8, 6)
    middle_up = is_finger_extended(hand, 12, 10)
    ring_up = is_finger_extended(hand, 16, 14)
    pinky_up = is_finger_extended(hand, 20, 18)

    thumb_dist_tip = np.hypot(hand[4].x - hand[17].x, hand[4].y - hand[17].y)
    thumb_dist_ip = np.hypot(hand[3].x - hand[17].x, hand[3].y - hand[17].y)
    thumb_up = thumb_dist_tip > (thumb_dist_ip * 1.15)

    if index_up and middle_up and not ring_up and not pinky_up:
        return 2, "2 Fingers · Next"

    if index_up and middle_up and ring_up and not pinky_up:
        return 3, "3 Fingers · Prev"

    if index_up and middle_up and ring_up and pinky_up:
        return 5, "Open Palm"

    if index_up and not middle_up and not ring_up and not pinky_up:
        return 1, "1 Finger"

    if not index_up and not middle_up and not ring_up and not pinky_up:
        return 0, "Fist"

    total = sum([index_up, middle_up, ring_up, pinky_up, thumb_up])
    return total, f"{total} Fingers"

def main():
    global current_mode, stop_requested

    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="presentation", choices=["presentation", "air_cursor"])
    args, _ = parser.parse_known_args()
    current_mode = args.mode

    log_event({"type": "status", "message": f"Initializing Spatial 1-Hand AI ({current_mode})..."})

    BaseOptions = mp.tasks.BaseOptions
    HandLandmarker = mp.tasks.vision.HandLandmarker
    HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=VisionRunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=0.30,
        min_hand_presence_confidence=0.30,
        min_tracking_confidence=0.30
    )

    landmarker = HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        time.sleep(0.3)
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        log_event({"type": "error", "message": "Failed to open webcam."})
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    log_event({"type": "ready", "message": "Spatial AI Online", "mode": current_mode})

    # Start background listener thread AFTER hardware and landmarker are fully initialized
    t = threading.Thread(target=stdin_listener, daemon=True)
    t.start()

    frame_timestamp_ms = 0
    last_ui_stream_time = 0
    was_hand_detected = False

    # Presentation Mode States
    current_gesture = None
    gesture_hold_frames = 0
    last_triggered_gesture = None
    last_trigger_time = 0
    REQUIRED_HOLD_FRAMES = 5
    REPEAT_COOLDOWN_SEC = 1.0

    # Air Cursor Spatial States
    smoothed_x = SCREEN_WIDTH / 2.0
    smoothed_y = SCREEN_HEIGHT / 2.0
    is_pinched_left = False
    is_pinched_right = False
    prev_scroll_y = None
    last_air_state = "move"

    # Comfort Interaction Box (0.18 - 0.82)
    BOX_X_MIN, BOX_X_MAX = 0.18, 0.82
    BOX_Y_MIN, BOX_Y_MAX = 0.18, 0.78

    while not stop_requested:
        ret, frame = cap.read()
        if not ret or frame is None:
            time.sleep(0.015)
            continue

        now = time.time()
        frame_timestamp_ms += 33

        # Horizontal mirror so physical hand movement matches screen movement
        frame = cv2.flip(frame, 1)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

        result = landmarker.detect_for_video(mp_image, frame_timestamp_ms)

        if result.hand_landmarks and len(result.hand_landmarks) > 0:
            was_hand_detected = True
            hand = result.hand_landmarks[0]

            wrist = hand[0]
            thumb_tip = hand[4]
            index_tip = hand[8]
            index_pip = hand[6]
            middle_tip = hand[12]
            middle_pip = hand[10]
            knuckle = hand[9]

            # Scale factor based on user's hand distance from camera
            hand_scale = np.hypot(knuckle.x - wrist.x, knuckle.y - wrist.y)
            if hand_scale < 0.04:
                hand_scale = 0.14

            finger_count, gesture_label = classify_fingers(hand)

            # ========================================================
            # MODE A: AIR-CURSOR SPATIAL CONTROL
            # ========================================================
            if current_mode == "air_cursor":
                dist_thumb_index = np.hypot(thumb_tip.x - index_tip.x, thumb_tip.y - index_tip.y) / hand_scale
                dist_thumb_middle = np.hypot(thumb_tip.x - middle_tip.x, thumb_tip.y - middle_tip.y) / hand_scale
                dist_index_middle = np.hypot(index_tip.x - middle_tip.x, index_tip.y - middle_tip.y) / hand_scale

                index_up = is_finger_extended(hand, 8, 6)
                middle_up = is_finger_extended(hand, 12, 10)
                ring_up = is_finger_extended(hand, 16, 14)
                pinky_up = is_finger_extended(hand, 20, 18)

                # 1. Closed Fist -> Park cursor (Rest Mode)
                if finger_count == 0:
                    if is_pinched_left and HAS_WIN32:
                        user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
                        is_pinched_left = False
                    last_air_state = "parked"
                    if now - last_ui_stream_time > 0.05:
                        last_ui_stream_time = now
                        log_event({"type": "air_cursor", "state": "parked", "label": "Hand Rested (Fist)"})

                # 2. Scroll Mode -> Index + Middle extended parallel, no pinch
                elif index_up and middle_up and not ring_up and not pinky_up and dist_index_middle < 0.38 and dist_thumb_index > 0.42:
                    if is_pinched_left and HAS_WIN32:
                        user32.mouse_event(0x0004, 0, 0, 0, 0)
                        is_pinched_left = False

                    if prev_scroll_y is not None:
                        dy = index_tip.y - prev_scroll_y
                        if abs(dy) > 0.010:
                            # Moving physical hand up scrolls document up
                            wheel_delta = int(-dy * 2200)
                            if HAS_WIN32:
                                user32.mouse_event(0x0800, 0, 0, wheel_delta, 0)
                            prev_scroll_y = index_tip.y
                            last_air_state = "scroll"
                    else:
                        prev_scroll_y = index_tip.y

                    if now - last_ui_stream_time > 0.05:
                        last_ui_stream_time = now
                        log_event({"type": "air_cursor", "state": "scroll", "label": "Air Scrolling"})

                # 3. Pointer Movement + Pinch Click/Drag Mode
                else:
                    prev_scroll_y = None

                    # Check Right Click (Thumb + Middle pinch, Index remaining up)
                    if dist_thumb_middle < 0.28 and not is_pinched_left and index_up:
                        if not is_pinched_right:
                            is_pinched_right = True
                            if HAS_WIN32:
                                user32.mouse_event(0x0008, 0, 0, 0, 0)  # RIGHT DOWN
                                user32.mouse_event(0x0010, 0, 0, 0, 0)  # RIGHT UP
                            last_air_state = "right_click"
                            log_event({"type": "air_cursor", "state": "right_click", "label": "Right Click"})
                    else:
                        if is_pinched_right and dist_thumb_middle >= 0.38:
                            is_pinched_right = False

                    # Check Left Click & Drag (Thumb + Index pinch)
                    if dist_thumb_index < 0.30 and not is_pinched_right:
                        if not is_pinched_left:
                            is_pinched_left = True
                            if HAS_WIN32:
                                user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFT DOWN
                            last_air_state = "drag"
                            log_event({"type": "air_cursor", "state": "drag", "label": "Pinch Drag"})
                    else:
                        if is_pinched_left and dist_thumb_index >= 0.40:
                            is_pinched_left = False
                            if HAS_WIN32:
                                user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
                            last_air_state = "move"
                            log_event({"type": "air_cursor", "state": "move", "label": "Pointer Released"})

                    # Cursor coordinates (track midpoint between fingers during pinch for stability)
                    track_x = (thumb_tip.x + index_tip.x) / 2.0 if is_pinched_left else index_tip.x
                    track_y = (thumb_tip.y + index_tip.y) / 2.0 if is_pinched_left else index_tip.y

                    # Normalize against comfort interaction box
                    norm_x = max(0.0, min(1.0, (track_x - BOX_X_MIN) / (BOX_X_MAX - BOX_X_MIN)))
                    norm_y = max(0.0, min(1.0, (track_y - BOX_Y_MIN) / (BOX_Y_MAX - BOX_Y_MIN)))

                    target_x = norm_x * SCREEN_WIDTH
                    target_y = norm_y * SCREEN_HEIGHT

                    # Adaptive EMA filter for jitter-free precision
                    dist_jump = np.hypot(target_x - smoothed_x, target_y - smoothed_y)
                    alpha = min(0.65, max(0.18, dist_jump / 75.0))
                    smoothed_x = smoothed_x * (1.0 - alpha) + target_x * alpha
                    smoothed_y = smoothed_y * (1.0 - alpha) + target_y * alpha

                    if HAS_WIN32:
                        user32.SetCursorPos(int(smoothed_x), int(smoothed_y))

                    if now - last_ui_stream_time > 0.05:
                        last_ui_stream_time = now
                        log_event({
                            "type": "air_cursor",
                            "state": "drag" if is_pinched_left else "move",
                            "x": float(norm_x),
                            "y": float(norm_y),
                            "pinched": is_pinched_left,
                            "label": "🤏 Dragging" if is_pinched_left else "🖐️ Cursor Active"
                        })

            # ========================================================
            # MODE B: PRESENTATION SLIDE CHANGER
            # ========================================================
            else:
                palm_x = hand[9].x
                palm_y = hand[9].y

                if now - last_ui_stream_time > 0.05:
                    last_ui_stream_time = now
                    log_event({
                        "type": "hand",
                        "x": float(palm_x),
                        "y": float(palm_y),
                        "fingers": finger_count,
                        "label": gesture_label
                    })

                if finger_count in (2, 3, 5):
                    if current_gesture == finger_count:
                        gesture_hold_frames += 1
                    else:
                        current_gesture = finger_count
                        gesture_hold_frames = 1

                    target_hold = 30 if finger_count == 5 else REQUIRED_HOLD_FRAMES
                    if gesture_hold_frames >= target_hold:
                        can_fire = (last_triggered_gesture != finger_count) or (now - last_trigger_time > REPEAT_COOLDOWN_SEC)
                        if can_fire:
                            last_triggered_gesture = finger_count
                            last_trigger_time = now

                            if finger_count == 2:
                                log_event({"type": "action", "action": "next", "reason": "2 Fingers · Next Slide"})
                            elif finger_count == 3:
                                log_event({"type": "action", "action": "prev", "reason": "3 Fingers · Previous Slide"})
                            elif finger_count == 5:
                                log_event({"type": "action", "action": "blackout", "reason": "Open Palm · Blank Screen"})
                else:
                    current_gesture = None
                    gesture_hold_frames = 0
                    last_triggered_gesture = None

        else:
            # Hand departed or lowered
            current_gesture = None
            gesture_hold_frames = 0
            last_triggered_gesture = None
            prev_scroll_y = None

            if is_pinched_left and HAS_WIN32:
                user32.mouse_event(0x0004, 0, 0, 0, 0)
                is_pinched_left = False

            if was_hand_detected:
                was_hand_detected = False
                log_event({"type": "no_hand"})

        time.sleep(0.015)

    # Clean release on main thread
    if is_pinched_left and HAS_WIN32:
        try:
            user32.mouse_event(0x0004, 0, 0, 0, 0)
        except Exception:
            pass

    if cap is not None and cap.isOpened():
        cap.release()
    cv2.destroyAllWindows()
    sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, SystemExit):
        sys.exit(0)
    except Exception as e:
        log_event({"type": "error", "message": str(e)})
        sys.exit(1)
