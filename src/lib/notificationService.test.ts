import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimelineEntry } from "@/lib/sessionEngine";

const nativeMock = vi.hoisted(() => ({ value: true }));
const notificationMock = vi.hoisted(() => ({
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  getPending: vi.fn(),
  cancel: vi.fn(),
  registerActionTypes: vi.fn(),
  schedule: vi.fn(),
  addListener: vi.fn(),
  listeners: new Map<string, (payload: unknown) => void>(),
  removers: [] as Array<ReturnType<typeof vi.fn>>,
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => nativeMock.value },
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    checkPermissions: notificationMock.checkPermissions,
    requestPermissions: notificationMock.requestPermissions,
    getPending: notificationMock.getPending,
    cancel: notificationMock.cancel,
    registerActionTypes: notificationMock.registerActionTypes,
    schedule: notificationMock.schedule,
    addListener: notificationMock.addListener,
  },
}));

import {
  ACTION_HAD_IT,
  ACTION_PLUS_15,
  DRINK_ACTION_TYPE_ID,
  buildTimelineNotifications,
  registerNotificationListeners,
  scheduleTimelineNotifications,
} from "@/lib/notificationService";

const at = (hour: number, minute: number): Date => new Date(2026, 7, 11, hour, minute, 0, 0);

const alcohol = (entryId: string, time: Date, drinkName: string): TimelineEntry => ({
  kind: "alcohol",
  entryId,
  drinkId: entryId.split(":")[0],
  drinkName,
  unitNumber: 1,
  totalUnits: 1,
  time,
  pureAlcoholMl: 12,
  percentageOfTarget: 25,
  icon: "",
  unit: "ml",
  intervalMinutes: 30,
});

const pause = (entryId: string, time: Date, volumeMl?: number): TimelineEntry => ({
  kind: "break",
  entryId,
  drinkId: "",
  drinkName: "Water break",
  unitNumber: 0,
  totalUnits: 0,
  time,
  pureAlcoholMl: 0,
  percentageOfTarget: 0,
  icon: "",
  unit: "",
  durationMinutes: 20,
  volumeMl,
});

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  nativeMock.value = true;
  notificationMock.listeners.clear();
  notificationMock.removers.length = 0;
  notificationMock.checkPermissions.mockResolvedValue({ display: "granted" });
  notificationMock.getPending.mockResolvedValue({ notifications: [{ id: 88 }] });
  notificationMock.cancel.mockResolvedValue(undefined);
  notificationMock.registerActionTypes.mockResolvedValue(undefined);
  notificationMock.schedule.mockResolvedValue(undefined);
  notificationMock.addListener.mockImplementation(
    async (eventName: string, callback: (payload: unknown) => void) => {
      const remove = vi.fn();
      notificationMock.listeners.set(eventName, callback);
      notificationMock.removers.push(remove);
      return { remove };
    },
  );
});

describe("timeline reminder copy", () => {
  it("builds actionable alcohol and quiet break reminders from stable entry ids", () => {
    const timeline = [
      alcohol("lager:unit:1", at(21, 5), "Lager"),
      pause("water:1", at(21, 35), 500),
      alcohol("wine:unit:1", at(21, 55), "Wine"),
    ];

    expect(buildTimelineNotifications(timeline)).toEqual([
      {
        entryId: "lager:unit:1",
        title: "Lager",
        body: "Due 21:05. First of 2.",
        time: at(21, 5),
        actionTypeId: DRINK_ACTION_TYPE_ID,
        extra: { entryId: "lager:unit:1" },
      },
      {
        entryId: "water:1",
        title: "Water, 500 ml",
        body: "Break until 21:55.",
        time: at(21, 35),
      },
      {
        entryId: "wine:unit:1",
        title: "Wine",
        body: "Due 21:55. Second of 2.",
        time: at(21, 55),
        actionTypeId: DRINK_ACTION_TYPE_ID,
        extra: { entryId: "wine:unit:1" },
      },
    ]);
  });

  it("replaces pending reminders and schedules only future entries with stable positive ids", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(21, 0));
    const duplicateTime = at(21, 30);

    await expect(
      scheduleTimelineNotifications([
        alcohol("past:unit:1", at(20, 59), "Past"),
        alcohol("lager:unit:1", duplicateTime, "Lager"),
        pause("water:1", duplicateTime, 500),
      ]),
    ).resolves.toBe(true);

    expect(notificationMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: 88 }] });
    expect(notificationMock.registerActionTypes).toHaveBeenCalledWith({
      types: [
        {
          id: DRINK_ACTION_TYPE_ID,
          actions: [
            { id: ACTION_HAD_IT, title: "Had it", foreground: false },
            { id: ACTION_PLUS_15, title: "+15 min", foreground: false },
          ],
        },
      ],
    });

    const scheduled = notificationMock.schedule.mock.calls[0][0].notifications;
    expect(scheduled).toHaveLength(2);
    expect(scheduled.map((item: { id: number }) => item.id)).toEqual([
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(scheduled[0].id).toBeGreaterThan(0);
    expect(scheduled[1].id).toBeGreaterThan(0);
    expect(scheduled[0].id).not.toBe(scheduled[1].id);
    expect(scheduled[0]).toMatchObject({
      actionTypeId: DRINK_ACTION_TYPE_ID,
      extra: { entryId: "lager:unit:1" },
      schedule: { at: duplicateTime },
    });
    expect(scheduled[1]).not.toHaveProperty("actionTypeId");
    expect(scheduled[1]).not.toHaveProperty("extra");
  });
});

describe("native reminder actions", () => {
  it("dispatches current action time to every live consumer through one listener pair", async () => {
    vi.useFakeTimers();
    const actionTime = at(22, 10);
    vi.setSystemTime(actionTime);
    const first = vi.fn();
    const second = vi.fn();

    const cleanupFirst = await registerNotificationListeners(first);
    const cleanupSecond = await registerNotificationListeners(second);

    expect(notificationMock.addListener).toHaveBeenCalledTimes(2);
    notificationMock.listeners.get("localNotificationActionPerformed")?.({
      actionId: ACTION_HAD_IT,
      notification: {
        extra: { entryId: "lager:unit:1" },
        schedule: { at: at(21, 5) },
      },
    });

    expect(first).toHaveBeenCalledWith(ACTION_HAD_IT, "lager:unit:1", actionTime);
    expect(second).toHaveBeenCalledWith(ACTION_HAD_IT, "lager:unit:1", actionTime);

    cleanupFirst();
    expect(notificationMock.removers.every((remove) => !remove.mock.calls.length)).toBe(true);
    notificationMock.listeners.get("localNotificationActionPerformed")?.({
      actionId: ACTION_PLUS_15,
      notification: { extra: { entryId: "lager:unit:1" } },
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    cleanupSecond();
    expect(notificationMock.removers.every((remove) => remove.mock.calls.length === 1)).toBe(true);
  });

  it("ignores unknown actions and missing entry ids", async () => {
    const handler = vi.fn();
    const cleanup = await registerNotificationListeners(handler);
    const dispatch = notificationMock.listeners.get("localNotificationActionPerformed");

    dispatch?.({ actionId: "unknown", notification: { extra: { entryId: "lager:unit:1" } } });
    dispatch?.({ actionId: ACTION_PLUS_15, notification: { extra: {} } });

    expect(handler).not.toHaveBeenCalled();
    cleanup();
  });
});
