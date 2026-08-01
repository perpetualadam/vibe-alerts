import { registerPlugin } from '@/lib/notifications/registry';
import { telegramPlugin } from '@/lib/notifications/providers/telegram';
import { emailPlugin } from '@/lib/notifications/providers/email';
import { whatsappPlugin } from '@/lib/notifications/providers/whatsapp';
import { slackPlugin } from '@/lib/notifications/providers/slack';
import { teamsPlugin } from '@/lib/notifications/providers/teams';

/** Register all built-in notification plugins */
const builtInPlugins = [
  telegramPlugin,
  emailPlugin,
  whatsappPlugin,
  slackPlugin,
  teamsPlugin,
];

for (const plugin of builtInPlugins) {
  registerPlugin(plugin);
}

export { builtInPlugins };
