import type {
  SimulationDraft,
  SimulationHotspotDraft,
  SimulationScreenDraft,
} from "./types";

export type SimulationPresetId =
  | "blank"
  | "bank_payment"
  | "gov_services"
  | "messenger";

function draftId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createSimulationScreen(index: number): SimulationScreenDraft {
  return {
    id: draftId("screen"),
    key: `screen_${index}`,
    title: `Экран ${index}`,
    imageUrl: "",
    isCompletion: false,
    hotspots: [],
  };
}

export function createSimulationHotspot(index: number): SimulationHotspotDraft {
  return {
    id: draftId("hotspot"),
    label: `Зона ${index}`,
    hint: "",
    x: 10,
    y: 10,
    width: 18,
    height: 12,
    targetScreenId: null,
  };
}

export function createInitialSimulationDraft(): SimulationDraft {
  const firstScreen = createSimulationScreen(1);
  return {
    version: 1,
    title: "Новый сценарий",
    targetApp: {
      appName: "Новое приложение",
      packageName: "com.example.app",
      storeType: "other",
      storeUrl: "",
      iconUrl: "",
      minSupportedVersion: "1.0.0",
      maxSupportedVersion: "1.0.0",
      releasedAt: "",
    },
    startScreenId: firstScreen.id,
    screens: [firstScreen],
    updatedAt: new Date().toISOString(),
  };
}

type PresetLocale = "ru" | "en";

function createDraftScreen(
  index: number,
  key: string,
  title: string,
  isCompletion: boolean,
): SimulationScreenDraft {
  const screen = createSimulationScreen(index);
  return {
    ...screen,
    key,
    title,
    isCompletion,
  };
}

function createDraftHotspot(
  index: number,
  options: {
    label: string;
    hint: string;
    targetScreenId: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
  },
): SimulationHotspotDraft {
  const hotspot = createSimulationHotspot(index);
  return {
    ...hotspot,
    ...options,
  };
}

function createBankPaymentPreset(locale: PresetLocale): SimulationDraft {
  const isRu = locale === "ru";
  const home = createDraftScreen(
    1,
    "home",
    isRu ? "Главный экран банка" : "Bank home screen",
    false,
  );
  const payment = createDraftScreen(
    2,
    "payment_form",
    isRu ? "Форма оплаты" : "Payment form",
    false,
  );
  const success = createDraftScreen(
    3,
    "payment_success",
    isRu ? "Оплата завершена" : "Payment complete",
    true,
  );

  home.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Платежи" : "Payments",
      hint: isRu
        ? "Нажмите «Платежи», чтобы перейти к форме."
        : "Tap “Payments” to open the form.",
      targetScreenId: payment.id,
      x: 18,
      y: 28,
      width: 24,
      height: 12,
    }),
  ];
  payment.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Оплатить" : "Pay",
      hint: isRu
        ? "Подтвердите платёж и завершите сценарий."
        : "Confirm payment to finish the scenario.",
      targetScreenId: success.id,
      x: 34,
      y: 76,
      width: 30,
      height: 12,
    }),
  ];

  return {
    version: 1,
    title: isRu ? "Оплата в банковском приложении" : "Banking app payment",
    targetApp: {
      appName: isRu ? "Банк Онлайн" : "Bank Online",
      packageName: "com.example.bank",
      storeType: "play_market",
      storeUrl: "",
      iconUrl: "",
      minSupportedVersion: "8.20.0",
      maxSupportedVersion: "8.20.99",
      releasedAt: "2026-01-15",
    },
    startScreenId: home.id,
    screens: [home, payment, success],
    updatedAt: new Date().toISOString(),
  };
}

function createGovServicesPreset(locale: PresetLocale): SimulationDraft {
  const isRu = locale === "ru";
  const catalog = createDraftScreen(
    1,
    "services_catalog",
    isRu ? "Каталог услуг" : "Services catalog",
    false,
  );
  const form = createDraftScreen(
    2,
    "request_form",
    isRu ? "Заявление на услугу" : "Service request form",
    false,
  );
  const done = createDraftScreen(
    3,
    "request_done",
    isRu ? "Заявление отправлено" : "Request submitted",
    true,
  );

  catalog.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Оформить услугу" : "Request service",
      hint: isRu
        ? "Откройте форму подачи заявления."
        : "Open the service request form.",
      targetScreenId: form.id,
      x: 22,
      y: 32,
      width: 28,
      height: 12,
    }),
  ];
  form.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Отправить" : "Submit",
      hint: isRu
        ? "Проверьте данные и отправьте заявление."
        : "Review details and submit request.",
      targetScreenId: done.id,
      x: 58,
      y: 78,
      width: 24,
      height: 12,
    }),
  ];

  return {
    version: 1,
    title: isRu ? "Оформление госуслуги" : "Government service flow",
    targetApp: {
      appName: isRu ? "Госуслуги" : "Government Services",
      packageName: "ru.gosuslugi.app",
      storeType: "rustore",
      storeUrl: "",
      iconUrl: "",
      minSupportedVersion: "5.4.0",
      maxSupportedVersion: "5.4.99",
      releasedAt: "2026-01-28",
    },
    startScreenId: catalog.id,
    screens: [catalog, form, done],
    updatedAt: new Date().toISOString(),
  };
}

function createMessengerPreset(locale: PresetLocale): SimulationDraft {
  const isRu = locale === "ru";
  const chats = createDraftScreen(
    1,
    "chats_list",
    isRu ? "Список чатов" : "Chats list",
    false,
  );
  const dialog = createDraftScreen(
    2,
    "chat_dialog",
    isRu ? "Диалог" : "Conversation",
    false,
  );
  const sent = createDraftScreen(
    3,
    "message_sent",
    isRu ? "Сообщение отправлено" : "Message sent",
    true,
  );

  chats.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Открыть чат" : "Open chat",
      hint: isRu
        ? "Выберите нужный диалог из списка."
        : "Select the target conversation.",
      targetScreenId: dialog.id,
      x: 8,
      y: 18,
      width: 84,
      height: 16,
    }),
  ];
  dialog.hotspots = [
    createDraftHotspot(1, {
      label: isRu ? "Отправить" : "Send",
      hint: isRu
        ? "Нажмите кнопку отправки сообщения."
        : "Tap send to deliver the message.",
      targetScreenId: sent.id,
      x: 72,
      y: 82,
      width: 20,
      height: 10,
    }),
  ];

  return {
    version: 1,
    title: isRu ? "Отправка сообщения" : "Send a message",
    targetApp: {
      appName: isRu ? "Telegram" : "Telegram",
      packageName: "org.telegram.messenger",
      storeType: "play_market",
      storeUrl: "",
      iconUrl: "",
      minSupportedVersion: "11.0.0",
      maxSupportedVersion: "11.0.99",
      releasedAt: "2026-02-01",
    },
    startScreenId: chats.id,
    screens: [chats, dialog, sent],
    updatedAt: new Date().toISOString(),
  };
}

export function createSimulationDraftFromPreset(
  presetId: SimulationPresetId,
  locale: PresetLocale = "ru",
): SimulationDraft {
  if (presetId === "blank") {
    const draft = createInitialSimulationDraft();
    if (locale === "en") {
      return {
        ...draft,
        title: "New scenario",
        targetApp: {
          ...draft.targetApp,
          appName: "New app",
          packageName: "com.example.app",
        },
        screens: draft.screens.map((screen, index) => ({
          ...screen,
          title: `Screen ${index + 1}`,
        })),
      };
    }
    return draft;
  }

  if (presetId === "bank_payment") {
    return createBankPaymentPreset(locale);
  }

  if (presetId === "gov_services") {
    return createGovServicesPreset(locale);
  }

  return createMessengerPreset(locale);
}
