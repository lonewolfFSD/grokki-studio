export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Filter out generic default placeholder names such as 'Friend' or empty whitespace.
 */
export function sanitizeGreetingName(rawName?: string | null): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';
  if (trimmed.toLowerCase() === 'friend') return '';
  return trimmed;
}

let lastChosenPhrase = '';

/**
 * Returns a randomized greeting phrase tailored to:
 * 1. Agent Mode vs General Chat Mode
 * 2. Presence of a personalized user name/nickname vs none
 * 3. Time of day (morning, afternoon, evening, night) mixed with general action/vibe phrases
 */
export function getRandomGreetingPhrase(
  agentMode: boolean,
  rawName?: string | null,
  forceTimeOfDay?: TimeOfDay
): string {
  const name = sanitizeGreetingName(rawName);
  const hasName = Boolean(name);
  const timeOfDay = forceTimeOfDay || getTimeOfDay();

  let timePhrases: string[] = [];
  let anytimePhrases: string[] = [];

  if (agentMode) {
    // -------------------------------------------------------------
    // AGENT CHAT MODE (Autonomous coding, terminal, building, repos)
    // -------------------------------------------------------------
    if (hasName) {
      if (timeOfDay === 'morning') {
        timePhrases = [
          `Good morning, ${name}. What are we building today?`,
          `Morning, ${name}! Ready to write some clean code?`,
          `Good morning, ${name}. Which repo are we shipping today?`,
          `Morning, ${name}. Let's dive in and build something great.`,
          `Rise and code, ${name}. What feature are we tackling first?`,
          `Good morning, ${name}. Autonomous coding agent ready for action.`,
          `Early sprint, ${name}? Let's knock out some features.`
        ];
      } else if (timeOfDay === 'afternoon') {
        timePhrases = [
          `Good afternoon, ${name}. What are we coding next?`,
          `Afternoon sprint, ${name}! What's the target?`,
          `Good afternoon, ${name}. Ready to build something impressive?`,
          `Afternoon, ${name}. Let's crush some bugs and ship features.`,
          `Hey ${name}, afternoon check-in. What codebase are we tackling?`,
          `Good afternoon, ${name}. Autonomous agent standing by.`,
          `Afternoon dev session, ${name}. What are we building?`
        ];
      } else if (timeOfDay === 'evening') {
        timePhrases = [
          `Good evening, ${name}. Wrapping up or starting a new build?`,
          `Evening, ${name}! What are we engineering tonight?`,
          `Good evening, ${name}. Ready to push some clean commits?`,
          `Evening session, ${name}. What are we building?`,
          `Hey ${name}, good evening. Let's knock out some code.`,
          `Good evening, ${name}. Full-stack agent primed and ready.`,
          `Evening code run, ${name}. What repo are we improving?`
        ];
      } else {
        timePhrases = [
          `Late night coding session, ${name}? Let's build.`,
          `Burning the midnight oil, ${name}? I'm right here with you.`,
          `Night owl mode activated, ${name}. What are we crafting?`,
          `Late night inspiration, ${name}? Let's turn it into code.`,
          `Quiet hours, peak focus, ${name}. What's the mission?`,
          `Still awake, ${name}? Let's ship something great.`,
          `Midnight dev run, ${name}. Let's make it count.`
        ];
      }

      anytimePhrases = [
        `Codebase engineer standing by. What are we building, ${name}?`,
        `Ready to inspect, refactor, and build. What's the target, ${name}?`,
        `Hey ${name}, point me to the codebase and let's get to work.`,
        `What are we architecting today, ${name}?`,
        `Give me a repo and a prompt, ${name}. I'll handle the rest.`,
        `Hey ${name}! Ready to refactor, debug, or build from scratch?`,
        `Full-stack agent active. What's on your agenda, ${name}?`,
        `Dev environment primed, ${name}. What are we creating?`,
        `Ready when you are, ${name}. What are we coding today?`,
        `Let's write clean code, squash bugs, and ship, ${name}.`,
        `System primed, ${name}. What feature are we tackling?`,
        `Hey ${name}, what problem are we engineering away today?`,
        `Ready to ship, ${name}. What's on the terminal today?`,
        `Autonomous workspace engineer active. What's the goal, ${name}?`
      ];
    } else {
      // Agent mode WITHOUT user name
      if (timeOfDay === 'morning') {
        timePhrases = [
          `Good morning. What are we building today?`,
          `Morning! Ready to write some clean code?`,
          `Good morning. Autonomous coding agent ready to build.`,
          `Morning! Let's dive into the codebase and ship.`,
          `Good morning. What feature are we tackling first?`,
          `Morning dev session. Ready to inspect, code, and execute.`,
          `Early morning sprint. What are we shipping today?`
        ];
      } else if (timeOfDay === 'afternoon') {
        timePhrases = [
          `Good afternoon. What are we coding next?`,
          `Afternoon sprint! What's the development roadmap today?`,
          `Good afternoon. Autonomous coding agent ready for action.`,
          `Afternoon! Let's crush some bugs and ship features.`,
          `Good afternoon. What codebase are we tackling today?`,
          `Afternoon session. Ready to build something impressive.`,
          `Midday coding flow. What repo are we working on?`
        ];
      } else if (timeOfDay === 'evening') {
        timePhrases = [
          `Good evening. Wrapping up or starting a new build?`,
          `Evening! What are we engineering tonight?`,
          `Good evening. Ready to push some clean commits?`,
          `Evening coding session. What are we building?`,
          `Good evening. Autonomous agent primed and standing by.`,
          `Evening! Let's knock out some clean code tonight.`,
          `Good evening. Ready to inspect, refactor, and build.`
        ];
      } else {
        timePhrases = [
          `Late night coding session? Let's build.`,
          `Burning the midnight oil? I'm right here with you.`,
          `Night owl mode activated. What are we crafting?`,
          `Late night inspiration? Let's turn it into code.`,
          `Quiet hours, peak focus. What's the mission tonight?`,
          `Still awake? Let's ship something great.`,
          `Midnight dev run. Autonomous agent standing by.`
        ];
      }

      anytimePhrases = [
        `Codebase engineer standing by. What are we building?`,
        `Ready to inspect, refactor, and build. What's the goal?`,
        `Point me to the codebase and let's get to work.`,
        `What are we architecting today?`,
        `Give me a repo and a prompt. I'll handle the rest.`,
        `Ready to refactor, debug, or build from scratch.`,
        `Autonomous agent standing by. What's on the agenda?`,
        `Full-stack mode primed. What are we creating today?`,
        `Ready when you are. What are we coding today?`,
        `Let's write clean code, squash bugs, and ship.`,
        `System primed. What feature are we tackling today?`,
        `What problem are we engineering away today?`,
        `Ready to ship. What's on the terminal today?`,
        `Autonomous workspace engineer active. What's the target?`
      ];
    }
  } else {
    // -------------------------------------------------------------
    // GENERAL CHAT MODE (Conversational, brainstorm, helpful, tasks)
    // -------------------------------------------------------------
    if (hasName) {
      if (timeOfDay === 'morning') {
        timePhrases = [
          `Good morning, ${name}! How can I help you today?`,
          `Morning, ${name}! What's on your mind today?`,
          `Good morning, ${name}! Ready for a productive day?`,
          `Rise and shine, ${name}! What can I assist you with?`,
          `Morning, ${name}! What are we tackling first?`,
          `Good morning, ${name}! Let's make today count.`,
          `Early morning start, ${name}! How can I help?`
        ];
      } else if (timeOfDay === 'afternoon') {
        timePhrases = [
          `Good afternoon, ${name}! How's your day going?`,
          `Afternoon, ${name}! What's on your agenda?`,
          `Good afternoon, ${name}! How can I help you right now?`,
          `Hey ${name}, afternoon check-in! What can I do for you?`,
          `Good afternoon, ${name}! Ready whenever you are.`,
          `Afternoon, ${name}! Need help with anything right now?`,
          `Hey ${name}, hope your afternoon is going smoothly!`
        ];
      } else if (timeOfDay === 'evening') {
        timePhrases = [
          `Good evening, ${name}! How was your day?`,
          `Evening, ${name}! What's on your mind tonight?`,
          `Good evening, ${name}! Unwinding or planning ahead?`,
          `Hey ${name}, good evening! How can I assist you tonight?`,
          `Evening, ${name}! Ready for some answers or a brainstorm?`,
          `Good evening, ${name}! What are we exploring tonight?`,
          `Evening wind-down, ${name}. What can I do for you?`
        ];
      } else {
        timePhrases = [
          `Late night thoughts, ${name}? What's on your mind?`,
          `Still up, ${name}? How can I help you tonight?`,
          `Night owl mode, ${name}. What are we exploring?`,
          `Late night query, ${name}? I'm listening.`,
          `Quiet night, ${name}. What can I do for you?`,
          `Burning the midnight oil, ${name}? Ask me anything.`,
          `Midnight curiosity, ${name}? Let's dive into it.`
        ];
      }

      anytimePhrases = [
        `Ready when you are, ${name}. How can I assist today?`,
        `Hey ${name}! What can I help you explore today?`,
        `How's it going, ${name}? What are we working on?`,
        `Hey ${name}, got a question or an idea? Let's talk.`,
        `At your service, ${name}. What's on your mind?`,
        `What's inspiring you today, ${name}?`,
        `Hey ${name}! Ask me anything or let's brainstorm together.`,
        `Always ready to help, ${name}. Where should we start?`,
        `Got a task, a thought, or a creative project, ${name}?`,
        `Hey ${name}, what problem can we solve together today?`,
        `What's on your agenda today, ${name}?`,
        `Hey ${name}! Ready to explore, draft, or problem-solve?`,
        `How can I make things easier for you today, ${name}?`,
        `Got something on your radar, ${name}? Let's unpack it.`
      ];
    } else {
      // General chat WITHOUT user name
      if (timeOfDay === 'morning') {
        timePhrases = [
          `Good morning! What's on your mind today?`,
          `Good morning! How can I help you today?`,
          `Morning! Ready to make today great?`,
          `Good morning! What can I assist you with?`,
          `Rise and shine! What are we working on today?`,
          `Good morning! Ready whenever you are.`,
          `Early morning start! What can I help you with?`
        ];
      } else if (timeOfDay === 'afternoon') {
        timePhrases = [
          `Good afternoon! How's your day going?`,
          `Good afternoon! How can I help you right now?`,
          `Afternoon! What can I assist you with today?`,
          `Good afternoon! Ready whenever you are.`,
          `Afternoon! What's on your mind?`,
          `Good afternoon! What are we exploring today?`,
          `Hope your afternoon is going smoothly! How can I help?`
        ];
      } else if (timeOfDay === 'evening') {
        timePhrases = [
          `Good evening! How can I help you tonight?`,
          `Good evening! What's on your mind tonight?`,
          `Evening! Unwinding or planning ahead?`,
          `Good evening! Ready for some answers or a brainstorm?`,
          `Evening! What can I do for you right now?`,
          `Good evening! What are we exploring tonight?`,
          `Evening wind-down. What can I help you with?`
        ];
      } else {
        timePhrases = [
          `Late night thoughts? What's on your mind?`,
          `Still awake? How can I help you tonight?`,
          `Late night mode. Ask me anything.`,
          `Quiet night. What are we exploring?`,
          `Midnight inspiration? Let's explore it.`,
          `Late night query? I'm listening.`,
          `Midnight curiosity? Let's dive in.`
        ];
      }

      anytimePhrases = [
        `How can I help you today?`,
        `What's on your mind today?`,
        `Ask me anything, brainstorm ideas, or let's solve a problem.`,
        `Ready to help. Where should we start?`,
        `Got a question or an idea? Let's talk.`,
        `How can I make your day easier today?`,
        `Always ready. What can I do for you?`,
        `Got a task or a creative idea? Let's dive in.`,
        `At your service. What are we exploring today?`,
        `What are we exploring or working on today?`,
        `Ready to explore, draft, or problem-solve.`,
        `Got a challenge today? Let's figure it out together.`,
        `Where should we begin today?`,
        `Got something on your radar? Let's unpack it.`
      ];
    }
  }

  // Sometime choose time-of-day (~50% chance), otherwise choose anytime action phrases (~50% chance)
  const useTimeOfDay = Math.random() < 0.50;
  const activePool = (useTimeOfDay && timePhrases.length > 0) ? timePhrases : anytimePhrases;

  // Avoid repeating the exact same phrase consecutively if possible
  const filtered = activePool.filter(p => p !== lastChosenPhrase);
  const candidates = filtered.length > 0 ? filtered : activePool;
  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  lastChosenPhrase = chosen;
  return chosen;
}
