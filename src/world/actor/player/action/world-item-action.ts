import { Player } from '@server/world/actor/player/player';
import { walkToAction } from '@server/world/actor/player/action/action';
import { basicNumberFilter, basicStringFilter } from '@server/plugins/plugin-loader';
import { logger } from '@runejs/core';
import { Action, questFilter } from '@server/plugins/plugin';
import { WorldItem } from '@server/world/items/world-item';
import { World } from '@server/game-server';

/**
 * The definition for a world item action function.
 */
export type worldItemAction = (worldItemActionData: WorldItemActionData) => void;

/**
 * Details about a world item being interacted with.
 */
export interface WorldItemActionData {
    // The player performing the action.
    player: Player;
    // The world item that the player is interacting with.
    worldItem: WorldItem;
}

/**
 * Defines an world item interaction plugin.
 */
export interface WorldItemAction extends Action {
    // A single game item ID or a list of item IDs that this action applies to.
    itemIds?: number | number[];
    // A single option name or a list of option names that this action applies to.
    options: string | string[];
    // Whether or not the player needs to walk to this world item before performing the action.
    walkTo: boolean;
    // The action function to be performed.
    action: worldItemAction;
}

/**
 * A directory of all world item interaction plugins.
 */
let worldItemActions: WorldItemAction[] = [
];

/**
 * Sets the list of world item interaction plugins.
 * @param actions The plugin list.
 */
export const setWorldItemActions = (actions: Action[]): void => {
    worldItemActions = actions as WorldItemAction[];
};

// @TODO priority and cancelling other (lower priority) actions
const actionHandler = (player: Player, worldItem: WorldItem, option: string): void => {
    if(player.busy) {
        return;
    }

    // Find all world item action plugins that reference this world item
    let interactionActions = worldItemActions.filter(plugin => {
        if(!questFilter(player, plugin)) {
            return false;
        }

        if(plugin.itemIds !== undefined) {
            if(!basicNumberFilter(plugin.itemIds, worldItem.itemId)) {
                return false;
            }
        }

        if(!basicStringFilter(plugin.options, option)) {
            return false;
        }

        return true;
    });
    const questActions = interactionActions.filter(plugin => plugin.questRequirement !== undefined);

    if(questActions.length !== 0) {
        interactionActions = questActions;
    }

    if(interactionActions.length === 0) {
        player.outgoingPackets.chatboxMessage(`Unhandled world item interaction: ${option} ${worldItem.itemId}`);
        return;
    }

    player.actionsCancelled.next();

    // Separate out walk-to actions from immediate actions
    const walkToPlugins = interactionActions.filter(plugin => plugin.walkTo);
    const immediatePlugins = interactionActions.filter(plugin => !plugin.walkTo);

    // Make sure we walk to the NPC before running any of the walk-to plugins
    if(walkToPlugins.length !== 0) {
        walkToAction(player, worldItem.position)
            .then(() => walkToPlugins.forEach(plugin => plugin.action({ player, worldItem })))
            .catch(() => logger.warn(`Unable to complete walk-to action.`));
    }

    // Immediately run any non-walk-to plugins
    if(immediatePlugins.length !== 0) {
        immediatePlugins.forEach(plugin => plugin.action({ player, worldItem }));
    }
};

World.registerActionEventListener('world_item_action', actionHandler);
