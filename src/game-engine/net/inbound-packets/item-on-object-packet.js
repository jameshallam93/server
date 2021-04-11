import { logger } from '@runejs/core';
import { Position } from '../../world/position';
import { filestore, world } from '../../game-server';
import { widgets } from '../../config';

const itemOnObjectPacket = (player, packet) => {
    const { buffer } = packet;
    const objectY = buffer.get('short', 'u', 'le');
    const itemId = buffer.get('short', 'u');
    const objectId = buffer.get('short', 'u', 'le');
    const itemSlot = buffer.get('short', 'u', 'le');
    const itemWidgetId = buffer.get('short', 's', 'le');
    const itemContainerId = buffer.get('short', 's', 'le');
    const objectX = buffer.get('short', 'u', 'le');

    let usedItem;
    if (itemWidgetId === widgets.inventory.widgetId && itemContainerId === widgets.inventory.containerId) {
        if (itemSlot < 0 || itemSlot > 27) {
            return;
        }

        usedItem = player.inventory.items[itemSlot];
        if (!usedItem) {
            return;
        }

        if (usedItem.itemId !== itemId) {
            return;
        }
    } else {
        logger.warn(`Unhandled item on object case using widget ${itemWidgetId}:${itemContainerId}`);
    }

    const level = player.position.level;
    const objectPosition = new Position(objectX, objectY, level);

    const { object: locationObject, cacheOriginal } = world.findObjectAtLocation(player, objectId, objectPosition);
    if(!locationObject) {
        return;
    }

    const objectConfig = filestore.configStore.objectStore.getObject(objectId);

    player.actionPipeline.call('item_on_object', player, locationObject, objectConfig, objectPosition, usedItem, itemWidgetId, itemContainerId, cacheOriginal);
};

export default {
    opcode: 24,
    size: 14,
    handler: itemOnObjectPacket
};