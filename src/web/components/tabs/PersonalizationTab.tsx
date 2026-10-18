import React from 'react';
import { JarvisConfig } from '../../types/jarvis';

interface PersonalizationTabProps {
  config: JarvisConfig;
  onChangeConfig: (patch: Partial<JarvisConfig>) => void;
}

export const PersonalizationTab = React.memo<PersonalizationTabProps>(({
  config,
  onChangeConfig,
}) => {
  const tones = [
    {
      id: 'companion',
      name: 'Warm Companion',
      desc: 'Friendly, empathetic, helpful, and natural everyday conversational tone.',
      badge: 'Default',
    },
    {
      id: 'architect',
      name: 'Concise Architect',
      desc: 'Extremely direct, code-first, minimal filler words, high technical precision.',
      badge: 'Pro Code',
    },
    {
      id: 'sarcastic',
      name: 'Sarcastic Tech Bro',
      desc: 'Witty, dry humor, blunt observations, energetic Hacker News banter.',
      badge: 'Humor',
    },
    {
      id: 'executive',
      name: 'Formal Executive',
      desc: 'Strictly professional, structured, polished business correspondence.',
      badge: 'Business',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Personalization & Tone
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Customize your identity and the assistant's conversational tone.
        </p>
      </div>

      {/* User Identity Form */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          User Profile
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Full Name
            </label>
            <input
              type="text"
              value={config.userName || ''}
              onChange={(e) => onChangeConfig({ userName: e.target.value })}
              placeholder="e.g. Alex"
              className="h-9 px-3 rounded-lg text-sm bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Preferred Nickname
            </label>
            <input
              type="text"
              value={config.userNickname || ''}
              onChange={(e) => onChangeConfig({ userNickname: e.target.value })}
              placeholder="e.g. Alex, Sam"
              className="h-9 px-3 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            User Context / Bio
          </label>
          <textarea
            rows={2}
            value={config.userBio || ''}
            onChange={(e) => onChangeConfig({ userBio: e.target.value })}
            placeholder="e.g. Software developer working on fullstack apps and automation."
            className="min-h-[64px] p-2.5 rounded-lg text-xs bg-gray-50 dark:bg-[#090a0d] border border-gray-200 dark:border-[#1e2029] text-gray-900 dark:text-gray-100 focus:border-gray-900 dark:focus:border-white focus:outline-none resize-y leading-normal transition-all"
          />
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Grokki remembers this context to deliver personalized code suggestions and answers.
          </span>
        </div>
      </div>

      {/* Companion Tone */}
      <div className="bg-white dark:bg-[#13141a] border border-[#e4e4eb] dark:border-[#1e2029] rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Tone & Persona
        </h3>
        <div className="grid grid-cols-2 gap-3.5 w-full">
          {tones.map((t) => {
            const isSelected = (config.userTone || 'companion') === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onChangeConfig({ userTone: t.id as any })}
                className={`flex flex-col gap-1.5 p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-gray-900 dark:border-white bg-white dark:bg-[#13141a] shadow-xs'
                    : 'border border-[#e4e4eb] dark:border-[#1e2029] bg-white dark:bg-[#13141a] hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    {t.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1a1c24] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#1e2029] uppercase tracking-wider">
                    {t.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                  {t.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
