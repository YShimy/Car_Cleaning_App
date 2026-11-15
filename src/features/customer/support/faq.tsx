import { DAMAGE_CLAIM_WINDOW_HOURS, PAUSE_RULES } from '@/config/business';
import { SERVICE_WINDOW_SENTENCE } from '@/lib/format';

export const FAQ = [
  {
    id: 'includes',
    title: 'What does a wash include?',
    content:
      'Every wash covers the exterior body, windows, wheels and rims, and mirrors. Plus and Premium also include interior cleans: vacuum, dashboard and floor mats. You get before and after photos every time.',
  },
  {
    id: 'rain',
    title: 'What if it rains?',
    content:
      'If the weather stops us, your wash moves to your compound’s next wash day automatically. We message you with the new date. You do not need to do anything.',
  },
  {
    id: 'pause',
    title: 'How do I pause?',
    content: `Open the Schedule tab and tap “Pause subscription”. You can pause for ${PAUSE_RULES.minWeeks} to ${PAUSE_RULES.maxWeeks} weeks, once every ${PAUSE_RULES.cooldownMonths} months. Billing pauses too, and your wash day is kept for you.`,
  },
  {
    id: 'damage',
    title: 'What if my car is damaged?',
    content: `Washers photograph your car before they start and note any existing marks. If you believe a wash caused damage, report it within ${DAMAGE_CLAIM_WINDOW_HOURS} hours from the wash page. We review the photos and cover the repair if we caused it.`,
  },
  {
    id: 'water',
    title: 'Do you use water?',
    content:
      'We use a waterless method: a spray that lifts the dirt, and clean microfibre cloths. Nothing runs onto the garage floor, which is why compounds allow us to wash inside.',
  },
  {
    id: 'washers',
    title: 'Who are the washers?',
    content:
      'Washers are our own trained staff. Each one is ID-verified and approved by your compound’s management before they are allowed in. You always see the washer’s name before they arrive.',
  },
  {
    id: 'cancel',
    title: 'How do I cancel?',
    content:
      'Go to Account and tap “Cancel subscription”. There is no fee and no phone call. Your washes continue until the end of the month you have paid for.',
  },
  {
    id: 'pay',
    title: 'How do I pay?',
    content: `You pay monthly by card, mobile wallet, InstaPay, or cash to the washer. The price you see is the full price. Washes happen between ${SERVICE_WINDOW_SENTENCE} on your wash day.`,
  },
];
