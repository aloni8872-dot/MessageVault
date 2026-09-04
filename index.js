import { FluxDispatcher } from "@revenge-mod/metro/common";
import { storage } from "@vendetta/plugin";

storage.messages ??= {};
storage.history ??= [];

function messageOf(p) {
    return p?.message ?? p;
}

function idOf(p) {
    const m = messageOf(p);
    return m?.id ?? p?.messageId ?? p?.message_id;
}

function channelOf(p) {
    const m = messageOf(p);
    return m?.channelId ?? m?.channel_id ?? p?.channelId ?? "";
}

function contentOf(p) {
    const m = messageOf(p);
    return typeof m?.content === "string" ? m.content : "";
}

function authorOf(p) {
    const m = messageOf(p);
    return m?.author?.username ?? "";
}

function createMessage(p) {
    const id = idOf(p);
    if (!id) return;

    storage.messages[id] = {
        id,
        channelId: channelOf(p),
        author: authorOf(p),
        content: contentOf(p),
        time: Date.now()
    };
}

function updateMessage(p) {
    const id = idOf(p);
    if (!id) return;

    const old = storage.messages[id];
    if (!old) return;

    const next = contentOf(p);

    if (old.content === next) return;

    storage.history.push({
        type: "edit",
        id,
        channelId: channelOf(p) || old.channelId,
        author: authorOf(p) || old.author,
        before: old.content,
        after: next,
        time: Date.now()
    });

    storage.messages[id] = {
        ...old,
        content: next
    };
}

function deleteMessage(p) {
    const id = idOf(p);
    if (!id) return;

    const old = storage.messages[id];
    if (!old) return;

    storage.history.push({
        type: "delete",
        id,
        channelId: channelOf(p) || old.channelId,
        author: old.author,
        content: old.content,
        time: Date.now()
    });

    delete storage.messages[id];
}

export default {
    onLoad() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", createMessage);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", updateMessage);
        FluxDispatcher.subscribe("MESSAGE_DELETE", deleteMessage);
    },

    onUnload() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", createMessage);
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", updateMessage);
        FluxDispatcher.unsubscribe("MESSAGE_DELETE", deleteMessage);
    }
};
