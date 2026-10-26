"""
Grokki Spatial AI Daemon (MediaPipe AI Python Engine)
Features:
1. AIR-CURSOR SPATIAL CONTROL:
   - Smooth Index Fingertip Tracking mapped to Windows Desktop with adaptive EMA smoothing
   - Index + Middle Fingertips Touching: Left Click & Drag (Native mouse_event)
   - Index + Middle Separated: Release Drag / Drop
   - Pinch Thumb + Index: Right Click (Context Menu)
   - 3 Fingers Up (Index + Middle + Ring): Smooth Mouse Wheel Scrolling
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
        while not stop_requested:
            line = sys.stdin.readline()
            if not line:
                # Pipe EOF or idle: keep alive, do NOT shut down daemon!
                time.sleep(0.2)
                continue
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

def sig_handler(signum, frame):
    global stop_requested
    stop_requested = True

try:
    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)
except Exception:
    pass

def is_finger_extended(hand, tip_idx, pip_idx):
    if not hand or len(hand) <= max(tip_idx, pip_idx):
        return False
    wrist = hand[0]
    tip = hand[tip_idx]
    pip = hand[pip_idx]

    dist_tip_wrist = np.hypot(tip.x - wrist.x, tip.y - wrist.y)
    dist_pip_wrist = np.hypot(pip.x - wrist.x, pip.y - wrist.y)

    is_upright = tip.y < pip.y
    has_reach = dist_tip_wrist > (dist_pip_wrist * 1.08)

    return is_upright and has_reach

def is_pinky_only(hand):
    if not hand or len(hand) < 21:
        return False
    index_up = is_finger_extended(hand, 8, 6)
    middle_up = is_finger_extended(hand, 12, 10)
    ring_up = is_finger_extended(hand, 16, 14)
    pinky_up = is_finger_extended(hand, 20, 18)

    thumb_dist_tip = np.hypot(hand[4].x - hand[17].x, hand[4].y - hand[17].y)
    thumb_dist_ip = np.hypot(hand[3].x - hand[17].x, hand[3].y - hand[17].y)
    thumb_up = thumb_dist_tip > (thumb_dist_ip * 1.15)

    return pinky_up and not index_up and not middle_up and not ring_up and not thumb_up

class OneEuroFilter:
    """
    Industry-standard 1 Euro Filter for zero-jitter, zero-latency spatial cursor tracking.
    Eliminates camera sensor noise while maintaining immediate 1:1 response during fast sweeps.
    """
    def __init__(self, min_cutoff=1.0, beta=0.035, d_cutoff=1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff
        self.reset()

    def reset(self):
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

    def filter(self, x, t):
        if self.t_prev is None or self.x_prev is None:
            self.t_prev = t
            self.x_prev = x
            self.dx_prev = 0.0
            return x
        dt = max(1e-4, t - self.t_prev)
        self.t_prev = t
        a_d = self._smoothing_factor(dt, self.d_cutoff)
        dx = (x - self.x_prev) / dt
        dx_hat = a_d * dx + (1.0 - a_d) * self.dx_prev
        self.dx_prev = dx_hat
        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._smoothing_factor(dt, cutoff)
        x_hat = a * x + (1.0 - a) * self.x_prev
        self.x_prev = x_hat
        return x_hat

    def _smoothing_factor(self, dt, cutoff):
        r = 2.0 * np.pi * cutoff * dt
        return r / (r + 1.0)

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

def identify_hands(result):
    """
    Classifies hands into (right_hand, left_hand).
    In mirrored video view (selfie mode):
    - Physical Right Hand appears on the right half of the image (or MediaPipe handedness 'Left').
    - Physical Left Hand appears on the left half of the image (or MediaPipe handedness 'Right').
    """
    if not result or not result.hand_landmarks or len(result.hand_landmarks) == 0:
        return None, None

    if len(result.hand_landmarks) == 1:
        hand = result.hand_landmarks[0]
        cat = ""
        try:
            if result.handedness and len(result.handedness) > 0 and len(result.handedness[0]) > 0:
                cat = getattr(result.handedness[0][0], 'category_name', '')
        except Exception:
            cat = ""

        if cat == "Left" or hand[0].x > 0.55:
            return hand, None
        elif cat == "Right" or hand[0].x < 0.45:
            return None, hand
        else:
            return hand, None

    hand_a = result.hand_landmarks[0]
    hand_b = result.hand_landmarks[1]
    if hand_a[0].x > hand_b[0].x:
        return hand_a, hand_b
    else:
        return hand_b, hand_a

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
        num_hands=2,
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
    cap.set(cv2.CAP_PROP_FPS, 60)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    log_event({"type": "ready", "message": "Spatial Multi-Hand AI Online", "mode": current_mode})

    # Start background listener thread AFTER hardware and landmarker are fully initialized
    t = threading.Thread(target=stdin_listener, daemon=True)
    t.start()

    start_time = time.time()
    last_timestamp_ms = 0
    last_ui_stream_time = 0
    was_hand_detected = False

    # Presentation Mode States
    current_gesture = None
    gesture_hold_frames = 0
    last_triggered_gesture = None
    last_trigger_time = 0
    REQUIRED_HOLD_FRAMES = 5
    REPEAT_COOLDOWN_SEC = 1.0

    # Right Hand Cursor, Click & Pinch Drag States (1 Euro Filter)
    euro_filter_x = OneEuroFilter(min_cutoff=0.9, beta=0.035)
    euro_filter_y = OneEuroFilter(min_cutoff=0.9, beta=0.035)
    pinch_dist_history = []
    consecutive_pinch_frames = 0
    consecutive_open_frames = 0
    is_pinched_left = False
    is_pinched_right = False
    pinch_in_progress = False
    pinch_start_time = 0.0
    pinch_start_pos = (0, 0)
    has_drag_started = False
    prev_scroll_y = None
    last_air_state = "move"

    # Emergency Sign Out / Lock Workstation State (Right Hand Pinky only)
    pinky_hold_frames = 0

    # Turn Off Air Cursor State (Open Palm 5 Fingers)
    stop_palm_hold_frames = 0
    left_palm_hold_frames = 0

    # Left Hand Companion App States (1 Finger / 2 Fingers)
    current_left_gesture = None
    left_gesture_hold_frames = 0
    last_triggered_left = None
    last_left_trigger_time = 0

    # High-reach interaction zone: 44% horizontal span, 50% vertical span.
    # Moving hand across ~18-20cm comfortably sweeps 100% of the screen from edge to edge!
    BOX_X_MIN, BOX_X_MAX = 0.28, 0.72
    BOX_Y_MIN, BOX_Y_MAX = 0.22, 0.72

    while not stop_requested:
        try:
            ret, frame = cap.read()
            if not ret or frame is None:
                time.sleep(0.005)
                continue

            now = time.time()
            # Strictly increasing real-time timestamp for MediaPipe tracking
            curr_timestamp_ms = int((now - start_time) * 1000)
            if curr_timestamp_ms <= last_timestamp_ms:
                curr_timestamp_ms = last_timestamp_ms + 1
            last_timestamp_ms = curr_timestamp_ms

            # Horizontal mirror so physical hand movement matches screen movement
            frame = cv2.flip(frame, 1)

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)

            result = landmarker.detect_for_video(mp_image, curr_timestamp_ms)

            right_hand, left_hand = identify_hands(result)

            if right_hand is not None or left_hand is not None:
                was_hand_detected = True

                # ========================================================
                # MODE A: AIR-CURSOR SPATIAL CONTROL
                # - RIGHT HAND: Exclusively controls Cursor movement & Index+Thumb Pinch Drag
                # - LEFT HAND: 1-Finger / 2-Fingers Quick App Launcher
                # ========================================================
                if current_mode == "air_cursor":
                    # --- PROCESS LEFT HAND (App Summoning & Open Palm Stop) ---
                    if left_hand is not None:
                        left_fingers, _ = classify_fingers(left_hand)
                        if left_fingers == 5:
                            left_palm_hold_frames += 1
                            current_left_gesture = None
                            left_gesture_hold_frames = 0
                            if left_palm_hold_frames >= 25:  # ~800ms Open Palm hold
                                left_palm_hold_frames = 0
                                if is_pinched_left and HAS_WIN32:
                                    user32.mouse_event(0x0004, 0, 0, 0, 0)
                                    is_pinched_left = False
                                log_event({"type": "action", "action": "stop_air_cursor", "label": "✋ Left Palm · Air Cursor Stopped"})
                                stop_requested = True
                                continue
                        elif left_fingers in (1, 2):
                            left_palm_hold_frames = 0
                            if current_left_gesture == left_fingers:
                                left_gesture_hold_frames += 1
                            else:
                                current_left_gesture = left_fingers
                                left_gesture_hold_frames = 1

                            if left_gesture_hold_frames >= 7:  # ~230ms steady hold
                                can_fire_left = (last_triggered_left != left_fingers) or (now - last_left_trigger_time > 1.8)
                                if can_fire_left:
                                    last_triggered_left = left_fingers
                                    last_left_trigger_time = now
                                    log_event({
                                        "type": "left_hand_gesture",
                                        "fingers": left_fingers,
                                        "label": f"Left Hand: {left_fingers} Finger(s)"
                                    })
                        else:
                            left_palm_hold_frames = 0
                            current_left_gesture = None
                            left_gesture_hold_frames = 0
                            last_triggered_left = None
                    else:
                        left_palm_hold_frames = 0
                        current_left_gesture = None
                        left_gesture_hold_frames = 0
                        last_triggered_left = None

                    # --- PROCESS RIGHT HAND (Cursor, Tap Click, Pinch Drag & Emergency Lock) ---
                    if right_hand is not None:
                        r_wrist = right_hand[0]
                        r_thumb = right_hand[4]
                        r_index = right_hand[8]
                        r_middle = right_hand[12]
                        r_knuckle = right_hand[9]

                        # Invariant 3D palm scale (eliminates foreshortening when hand tilts)
                        dx_w = r_knuckle.x - r_wrist.x
                        dy_w = r_knuckle.y - r_wrist.y
                        dz_w = (r_knuckle.z - r_wrist.z) if hasattr(r_knuckle, 'z') else 0.0
                        palm_scale_3d = float(np.sqrt(dx_w*dx_w + dy_w*dy_w + dz_w*dz_w))
                        if palm_scale_3d < 0.04:
                            palm_scale_3d = 0.15

                        r_fingers, _ = classify_fingers(right_hand)
                        r_index_up = is_finger_extended(right_hand, 8, 6)
                        r_middle_up = is_finger_extended(right_hand, 12, 10)
                        r_ring_up = is_finger_extended(right_hand, 16, 14)
                        r_pinky_up = is_finger_extended(right_hand, 20, 18)

                        # 3D Distance between Thumb tip (4) and Index tip (8)
                        dx_ti = r_thumb.x - r_index.x
                        dy_ti = r_thumb.y - r_index.y
                        dz_ti = (r_thumb.z - r_index.z) if hasattr(r_thumb, 'z') else 0.0
                        dist_3d_ti = float(np.sqrt(dx_ti*dx_ti + dy_ti*dy_ti + dz_ti*dz_ti))
                        norm_pinch = dist_3d_ti / palm_scale_3d

                        # 3-frame rolling median filter to wipe out camera noise spikes
                        pinch_dist_history.append(norm_pinch)
                        if len(pinch_dist_history) > 3:
                            pinch_dist_history.pop(0)
                        smoothed_pinch = float(np.median(pinch_dist_history))

                        # 3D Distance between Thumb tip (4) and Middle tip (12) for Right-Click
                        dx_tm = r_thumb.x - r_middle.x
                        dy_tm = r_thumb.y - r_middle.y
                        dz_tm = (r_thumb.z - r_middle.z) if hasattr(r_thumb, 'z') else 0.0
                        dist_3d_tm = float(np.sqrt(dx_tm*dx_tm + dy_tm*dy_tm + dz_tm*dz_tm))
                        norm_middle_pinch = dist_3d_tm / palm_scale_3d

                        # ========================================================
                        # GESTURE 1: EMERGENCY SIGN OUT / LOCK WINDOWS (Pinky ONLY)
                        # ========================================================
                        if is_pinky_only(right_hand):
                            pinky_hold_frames += 1
                            stop_palm_hold_frames = 0
                            consecutive_pinch_frames = 0
                            if pinky_hold_frames >= 14:  # ~450ms hold
                                pinky_hold_frames = 0
                                if is_pinched_left and HAS_WIN32:
                                    user32.mouse_event(0x0004, 0, 0, 0, 0)
                                    is_pinched_left = False
                                log_event({
                                    "type": "action",
                                    "action": "emergency_lock",
                                    "label": "🚨 Emergency Sign Out & Windows Lock Screen"
                                })
                                if HAS_WIN32:
                                    try:
                                        user32.LockWorkStation()
                                    except Exception:
                                        pass
                                stop_requested = True
                                continue
                        else:
                            pinky_hold_frames = 0

                        # ========================================================
                        # GESTURE 2: TURN OFF AIR-CURSOR (Open Palm 5 Fingers)
                        # ========================================================
                        if r_fingers == 5 and r_index_up and r_middle_up and r_ring_up and r_pinky_up and smoothed_pinch > 0.40:
                            stop_palm_hold_frames += 1
                            if stop_palm_hold_frames >= 28:  # ~900ms hold
                                stop_palm_hold_frames = 0
                                if is_pinched_left and HAS_WIN32:
                                    user32.mouse_event(0x0004, 0, 0, 0, 0)
                                    is_pinched_left = False
                                log_event({
                                    "type": "action",
                                    "action": "stop_air_cursor",
                                    "label": "✋ Open Palm · Air Cursor Deactivated"
                                })
                                stop_requested = True
                                continue
                        else:
                            stop_palm_hold_frames = 0

                        # ========================================================
                        # GESTURE 3: CLOSED FIST -> PARK CURSOR (Rest Mode)
                        # ========================================================
                        if r_fingers == 0:
                            if is_pinched_left and HAS_WIN32:
                                user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
                                is_pinched_left = False
                            pinch_in_progress = False
                            has_drag_started = False
                            consecutive_pinch_frames = 0
                            consecutive_open_frames = 0
                            last_air_state = "parked"
                            if now - last_ui_stream_time > 0.05:
                                last_ui_stream_time = now
                                log_event({"type": "air_cursor", "state": "parked", "label": "Right Hand Rested (Fist)"})

                        # ========================================================
                        # GESTURE 4: SCROLL MODE -> 3 FINGERS UP (Index+Middle+Ring)
                        # ========================================================
                        elif r_index_up and r_middle_up and r_ring_up and not r_pinky_up and smoothed_pinch > 0.35:
                            if is_pinched_left and HAS_WIN32:
                                user32.mouse_event(0x0004, 0, 0, 0, 0)
                                is_pinched_left = False
                            pinch_in_progress = False
                            has_drag_started = False
                            consecutive_pinch_frames = 0
                            consecutive_open_frames = 0

                            if prev_scroll_y is not None:
                                dy = r_index.y - prev_scroll_y
                                if abs(dy) > 0.006:
                                    wheel_delta = int(-dy * 2600)
                                    if HAS_WIN32:
                                        user32.mouse_event(0x0800, 0, 0, wheel_delta, 0)
                                    prev_scroll_y = r_index.y
                                    last_air_state = "scroll"
                            else:
                                prev_scroll_y = r_index.y

                            if now - last_ui_stream_time > 0.05:
                                last_ui_stream_time = now
                                log_event({"type": "air_cursor", "state": "scroll", "label": "Air Scrolling (3 Fingers)"})

                        # ========================================================
                        # GESTURE 5: POINTER MOVEMENT, TAP LEFT CLICK & PINCH DRAG
                        # ========================================================
                        else:
                            prev_scroll_y = None

                            # Right Click: Thumb + Middle pinch when Index is separated
                            if norm_middle_pinch < 0.25 and smoothed_pinch > 0.35 and not is_pinched_left and not pinch_in_progress:
                                if not is_pinched_right:
                                    is_pinched_right = True
                                    if HAS_WIN32:
                                        user32.mouse_event(0x0008, 0, 0, 0, 0)  # RIGHT DOWN
                                        user32.mouse_event(0x0010, 0, 0, 0, 0)  # RIGHT UP
                                    last_air_state = "right_click"
                                    log_event({"type": "air_cursor", "state": "right_click", "label": "Right Click"})
                            else:
                                if is_pinched_right and norm_middle_pinch >= 0.35:
                                    is_pinched_right = False

                            # Index fingertip position mapping
                            track_x = r_index.x
                            track_y = r_index.y

                            raw_norm_x = (track_x - BOX_X_MIN) / (BOX_X_MAX - BOX_X_MIN)
                            raw_norm_y = (track_y - BOX_Y_MIN) / (BOX_Y_MAX - BOX_Y_MIN)
                            norm_x = max(0.0, min(1.0, raw_norm_x))
                            norm_y = max(0.0, min(1.0, raw_norm_y))

                            target_x = norm_x * (SCREEN_WIDTH - 1)
                            target_y = norm_y * (SCREEN_HEIGHT - 1)

                            # 1 Euro Filter: silky smooth, zero-tremor stationary + zero lag on fast sweep
                            filtered_x = euro_filter_x.filter(target_x, now)
                            filtered_y = euro_filter_y.filter(target_y, now)

                            final_x = int(round(filtered_x))
                            final_y = int(round(filtered_y))

                            # Debounced Index + Thumb Pinch detection:
                            if smoothed_pinch < 0.28:
                                consecutive_pinch_frames += 1
                                consecutive_open_frames = 0
                            elif smoothed_pinch >= 0.38:
                                consecutive_open_frames += 1
                                consecutive_pinch_frames = 0
                            else:
                                consecutive_pinch_frames = 0
                                consecutive_open_frames = 0

                            # 1. Onset of pinch (Thumb + Index touching)
                            if consecutive_pinch_frames >= 2 and not pinch_in_progress and not is_pinched_right:
                                pinch_in_progress = True
                                pinch_start_time = now
                                pinch_start_pos = (final_x, final_y)
                                has_drag_started = False

                            # 2. While fingers are touching:
                            if pinch_in_progress:
                                dist_from_start = np.hypot(final_x - pinch_start_pos[0], final_y - pinch_start_pos[1])
                                pinch_duration = now - pinch_start_time

                                # Transition into DRAG if moved > 14 pixels OR held > 350ms
                                if not has_drag_started:
                                    if dist_from_start > 14 or (pinch_duration > 0.35 and dist_from_start > 4):
                                        has_drag_started = True
                                        is_pinched_left = True
                                        if HAS_WIN32:
                                            abs_x0 = int((pinch_start_pos[0] / max(1, SCREEN_WIDTH - 1)) * 65535)
                                            abs_y0 = int((pinch_start_pos[1] / max(1, SCREEN_HEIGHT - 1)) * 65535)
                                            user32.mouse_event(0x8001, abs_x0, abs_y0, 0, 0)
                                            user32.SetCursorPos(pinch_start_pos[0], pinch_start_pos[1])
                                            user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFT DOWN
                                        last_air_state = "drag"
                                        log_event({"type": "air_cursor", "state": "drag", "label": "🤏 Dragging (Thumb+Index)"})

                                if has_drag_started:
                                    if HAS_WIN32:
                                        abs_x = int((final_x / max(1, SCREEN_WIDTH - 1)) * 65535)
                                        abs_y = int((final_y / max(1, SCREEN_HEIGHT - 1)) * 65535)
                                        user32.mouse_event(0x8001, abs_x, abs_y, 0, 0)
                                        user32.SetCursorPos(final_x, final_y)

                                # 3. Release check:
                                if consecutive_open_frames >= 3 or r_fingers == 0:
                                    pinch_in_progress = False
                                    if has_drag_started:
                                        # Drag finished: Drop
                                        is_pinched_left = False
                                        if HAS_WIN32:
                                            user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
                                        last_air_state = "move"
                                        log_event({"type": "air_cursor", "state": "move", "label": "Pinch Released (Dropped)"})
                                    else:
                                        # Quick tap & release -> CRISP SINGLE LEFT CLICK!
                                        if HAS_WIN32:
                                            user32.mouse_event(0x0002, 0, 0, 0, 0)  # LEFT DOWN
                                            user32.mouse_event(0x0004, 0, 0, 0, 0)  # LEFT UP
                                        last_air_state = "click"
                                        log_event({"type": "air_cursor", "state": "click", "label": "🖱️ Single Left Click"})
                                    has_drag_started = False

                            else:
                                # Not pinching: free gliding cursor
                                if HAS_WIN32:
                                    abs_x = int((final_x / max(1, SCREEN_WIDTH - 1)) * 65535)
                                    abs_y = int((final_y / max(1, SCREEN_HEIGHT - 1)) * 65535)
                                    user32.mouse_event(0x8001, abs_x, abs_y, 0, 0)
                                    user32.SetCursorPos(final_x, final_y)

                            if now - last_ui_stream_time > 0.05:
                                last_ui_stream_time = now
                                log_event({
                                    "type": "air_cursor",
                                    "state": "drag" if is_pinched_left else ("click" if last_air_state == "click" else "move"),
                                    "x": float(norm_x),
                                    "y": float(norm_y),
                                    "pinched": is_pinched_left,
                                    "label": "🤏 Dragging (Thumb+Index)" if is_pinched_left else ("🖱️ Left Click" if last_air_state == "click" else "🖐️ Cursor Active")
                                })

                    else:
                        # Right hand not visible -> safely release mouse drag if was dragging
                        if is_pinched_left and HAS_WIN32:
                            user32.mouse_event(0x0004, 0, 0, 0, 0)
                            is_pinched_left = False
                        pinch_in_progress = False
                        has_drag_started = False
                        euro_filter_x.reset()
                        euro_filter_y.reset()
                        prev_scroll_y = None

                # ========================================================
                # MODE B: PRESENTATION SLIDE CHANGER
                # ========================================================
                else:
                    pres_hand = right_hand if right_hand is not None else left_hand
                    palm_x = pres_hand[9].x
                    palm_y = pres_hand[9].y
                    finger_count, gesture_label = classify_fingers(pres_hand)

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
                # No hands detected at all
                current_gesture = None
                gesture_hold_frames = 0
                last_triggered_gesture = None
                current_left_gesture = None
                left_gesture_hold_frames = 0
                last_triggered_left = None
                prev_scroll_y = None
                euro_filter_x.reset()
                euro_filter_y.reset()

                if is_pinched_left and HAS_WIN32:
                    user32.mouse_event(0x0004, 0, 0, 0, 0)
                    is_pinched_left = False

                if was_hand_detected:
                    was_hand_detected = False
                    log_event({"type": "no_hand"})

        except Exception as frame_err:
            time.sleep(0.005)
            continue

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
