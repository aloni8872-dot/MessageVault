vendetta => {
    const FluxDispatcher = vendetta.metro.common.FluxDispatcher;
    const storage = vendetta.plugin.storage;

    storage.messages ??= {};
    storage.history ??= [];

    const MAX_MESSAGES = 3000;
    const MAX_HISTORY = 5000;

    function getMessage(payload) {
        return payload?.message ?? payload;
    }

    function getId(payload) {
        const m = getMessage(payload);
        return m?.id ?? payload?.messageId ?? payload?.message_id;
    }

    function getChannelId(payload) {
        const m = getMessage(payload);
        return m?.channelId ?? m?.channel_id ??
            payload?.channelId ?? payload?.channel_id ?? "";
    }

    function getContent(payload) {
        const m = getMessage(payload);
        return typeof m?.content === "string" ? m.content : "";
    }

    function getAuthor(payload) {
        const m = getMessage(payload);
        return m?.author?.globalName ??
            m?.author?.username ??
            m?.author?.displayName ?? "";
    }

    function trim() {
        const messageKeys = Object.keys(storage.messages);
        if (messageKeys.length > MAX_MESSAGES) {
            messageKeys
                .sort((a, b) =>
                    (storage.messages[a]?.time ?? 0) -
                    (storage.messages[b]?.time ?? 0))
                .slice(0, messageKeys.length - MAX_MESSAGES)
                .forEach(k => delete storage.messages[k]);
        }

        if (storage.history.length > MAX_HISTORY) {
            storage.history.splice(
                0,
                storage.history.length - MAX_HISTORY
            );
        }
    }

    function onCreate(payload) {
        const id = getId(payload);
        if (!id) return;

        storage.messages[id] = {
            id,
            channelId: getChannelId(payload),
            author: getAuthor(payload),
            content: getContent(payload),
            time: Date.now()
        };

        trim();
    }

    function onUpdate(payload) {
        const id = getId(payload);
        if (!id) return;

        const old = storage.messages[id];
        if (!old) return;

        const next = getContent(payload);
        if (old.content === next) return;

        storage.history.push({
            type: "edit",
            id,
            channelId: getChannelId(payload) || old.channelId,
            author: getAuthor(payload) || old.author,
            before: old.content,
            after: next,
            time: Date.now()
        });

        storage.messages[id] = {
            ...old,
            content: next,
            time: Date.now()
        };

        trim();
    }

    function onDelete(payload) {
        const id = getId(payload);
        if (!id) return;

        const old = storage.messages[id];
        if (!old) return;

        storage.history.push({
            type: "delete",
            id,
            channelId: getChannelId(payload) || old.channelId,
            author: old.author,
            content: old.content,
            time: Date.now()
        });

        delete storage.messages[id];
        trim();
    }

    return {
        onLoad() {
            FluxDispatcher.subscribe("MESSAGE_CREATE", onCreate);
            FluxDispatcher.subscribe("MESSAGE_UPDATE", onUpdate);
            FluxDispatcher.subscribe("MESSAGE_DELETE", onDelete);
        },

        onUnload() {
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", onCreate);
            FluxDispatcher.unsubscribe("MESSAGE_UPDATE", onUpdate);
            FluxDispatcher.unsubscribe("MESSAGE_DELETE", onDelete);
        }
    };
}
