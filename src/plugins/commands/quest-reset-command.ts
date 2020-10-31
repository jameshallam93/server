import { commandAction } from '@server/world/actor/player/action/input-command-action';
import { widgetScripts } from '@server/world/config/widget';

const action: commandAction = (details) => {
    const { player } = details;

    player.quests.find(quest => quest.questId === 'cooksAssistant').stage = 'COLLECTING';
    player.outgoingPackets.updateClientConfig(widgetScripts.questPoints, 1000);
};

export default {
    type: 'player_command', commands: 'resetquests', action
};
