import { FluxDispatcher } from "@revenge-mod/metro/common";
import { storage } from "@vendetta/plugin";

const MAX_MESSAGES = 3000;
const MAX_HISTORY = 5000;

storage.enabled ??= true;
storage.messages ??= {};
storage.history ??= [];

function getMessage(payload) {
    return payload?.message ?? payload;
}

function getId(payload) {
    const message = getMessage(payload);
    return message?.id ?? payload?.messageId ?? payload?.message_id;
}

function getChannelId(payload) {
    const message = getMessage(payload);
    return (
        message?.channelId ??
        message?.channel_id ??
        payload?.channelId ??
        payload?.channel_id ??
        ""
    );
}

function getContent(payload) {
    const message = getMessage(payload);
    return typeof message?.content === "string"
        ? message.content
        : "";
}

function getAuthor(payload) {
    const message = getMessage(payload);
    const author = message?.author;

    return (
        author?.globalName ??
        author?.username ??
        author?.displayName ??
        ""
    );
}

function trim() {
    const messages = storage.messages;
    const keys = Object.keys(messages);

    if (keys.length > MAX_MESSAGES) {
        keys
            .sort(
                (a, b) =>
                    (messages[a]?.time ?? 0) -
                    (messages[b]?.time ?? 0)
            )
            .slice(0, keys.length - MAX_MESSAGES)
            .forEach((key) => delete messages[key]);
    }

    if (storage.history.length > MAX_HISTORY) {
        storage.history.splice(
            0,
            storage.history.length - MAX_HISTORY
        );
    }
}

function rememberMessage(payload) {
    if (!storage.enabled) return;

    const id = getId(payload);
    const channelId = getChannelId(payload);

    if (!id || !channelId) return;

    storage.messages[id] = {
        id,
        channelId,
        author: getAuthor(payload),
        content: getContent(payload),
        time: Date.now(),
    };

    trim();
}

function handleEdit(payload) {
    if (!storage.enabled) return;

    const id = getId(payload);
    if (!id) return;

    const oldMessage = storage.messages[id];
    if (!oldMessage) return;

    const newContent = getContent(payload);

    if (oldMessage.content === newContent) return;

    storage.history.push({
        type: "edit",
        id,
        channelId:
            getChannelId(payload) || oldMessage.channelId,
        author:
            getAuthor(payload) || oldMessage.author,
        before: oldMessage.content,
        after: newContent,
        time: Date.now(),
    });

    storage.messages[id] = {
        ...oldMessage,
        content: newContent,
        time: Date.now(),
    };

    trim();
}

function handleDelete(payload) {
    if (!storage.enabled) return;

    const id = getId(payload);
    if (!id) return;

    const oldMessage = storage.messages[id];
    if (!oldMessage) return;

    storage.history.push({
        type: "delete",
        id,
        channelId:
            getChannelId(payload) || oldMessage.channelId,
        author: oldMessage.author,
        content: oldMessage.content,
        time: Date.now(),
    });

    delete storage.messages[id];

    trim();
}

export default {
    onLoad() {
        FluxDispatcher.subscribe(
            "MESSAGE_CREATE",
            rememberMessage
        );

        FluxDispatcher.subscribe(
            "MESSAGE_UPDATE",
            handleEdit
        );

        FluxDispatcher.subscribe(
            "MESSAGE_DELETE",
            handleDelete
        );
    },

    onUnload() {
        FluxDispatcher.unsubscribe(
            "MESSAGE_CREATE",
            rememberMessage
        );

        FluxDispatcher.unsubscribe(
            "MESSAGE_UPDATE",
            handleEdit
        );

        FluxDispatcher.unsubscribe(
            "MESSAGE_DELETE",
            handleDelete
        );
    },
};    id, channelId, author: authorOf(p),
    content: contentOf(p), time: Date.now()
  };
  trim();
}

function edited(p) {
  if (!state.enabled) return;
  const id = idOf(p);
  if (!id) return;
  const old = state.messages[id];
  const next = contentOf(p);
  if (!old || old.content === next) return;

  state.history.push({
    type: "edit", id, channelId: channelOf(p) || old.channelId,
    author: authorOf(p) || old.author,
    before: old.content, after: next, time: Date.now()
  });
  state.messages[id] = {...old, content: next};
  trim();
}

function deleted(p) {
  if (!state.enabled) return;
  const id = idOf(p);
  if (!id) return;
  const old = state.messages[id];
  if (!old) return;

  state.history.push({
    type: "delete", id, channelId: channelOf(p) || old.channelId,
    author: old.author, content: old.content, time: Date.now()
  });
  delete state.messages[id];
  trim();
}

export default {
  onLoad() {
    FluxDispatcher.subscribe("MESSAGE_CREATE", remember);
    FluxDispatcher.subscribe("MESSAGE_UPDATE", edited);
    FluxDispatcher.subscribe("MESSAGE_DELETE", deleted);
  },

  onUnload() {
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", remember);
    FluxDispatcher.unsubscribe("MESSAGE_UPDATE", edited);
    FluxDispatcher.unsubscribe("MESSAGE_DELETE", deleted);
  },

  settings: {
    type: "route",
    render: () => {
      const enabled = state.enabled;
      const history = [...state.history].reverse();

      return React.createElement(ReactNative.ScrollView, {
        style: {flex: 1},
        contentContainerStyle: {padding: 16}
      }, [
        React.createElement(Forms.FormRow, {
          key: "toggle",
          label: "Monitoramento",
          subLabel: enabled ? "Ativado" : "Desativado",
          onPress: () => { state.enabled = !state.enabled; }
        }),
        React.createElement(Forms.FormRow, {
          key: "clear",
          label: "Limpar histórico",
          subLabel: "Remove o histórico salvo localmente.",
          onPress: () => { state.history = []; state.messages = {}; }
        }),
        ...history.map((x, i) => React.createElement(Forms.FormRow, {
          key: `${x.id}-${x.time}-${i}`,
          label: `${x.type === "delete" ? "🗑️ Apagada" : "✏️ Editada"}${x.author ? " • " + x.author : ""}`,
          subLabel: x.type === "delete"
            ? `${new Date(x.time).toLocaleString()}\n${x.content || "(sem texto)"}`
            : `${new Date(x.time).toLocaleString()}\nAntes: ${x.before || "(vazio)"}\nDepois: ${x.after || "(vazio)"}`,
        }))
      ]);
    }
  }
};
