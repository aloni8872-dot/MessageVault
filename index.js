import { FluxDispatcher } from "@metro/common";
import { storage } from "@vendetta/plugin";
import { ReactNative, React, stylesheet, lodash } from "@metro/common";
import { Forms } from "@ui/components/Forms";

const MAX = 3000;

const state = storage;
state.enabled ??= true;
state.messages ??= {};
state.history ??= [];

const getMsg = p => p?.message ?? p;
const idOf = p => getMsg(p)?.id ?? p?.messageId ?? p?.message_id;
const channelOf = p => getMsg(p)?.channelId ?? getMsg(p)?.channel_id ?? p?.channelId ?? p?.channel_id ?? "";
const contentOf = p => typeof getMsg(p)?.content === "string" ? getMsg(p).content : "";
const authorOf = p => {
  const a = getMsg(p)?.author;
  return a?.globalName ?? a?.username ?? a?.displayName ?? "";
};

function trim() {
  const keys = Object.keys(state.messages);
  if (keys.length > MAX) {
    keys.sort((a,b) => (state.messages[a].time||0) - (state.messages[b].time||0))
      .slice(0, keys.length - MAX)
      .forEach(k => delete state.messages[k]);
  }
  if (state.history.length > MAX) state.history.splice(0, state.history.length - MAX);
}

function remember(p) {
  if (!state.enabled) return;
  const id = idOf(p), channelId = channelOf(p);
  if (!id || !channelId) return;
  state.messages[id] = {
    id, channelId, author: authorOf(p),
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
