import { describe, expect, test } from "bun:test";
import { InputHistory } from "../input-history.js";

describe("InputHistory – initial state", () => {
  test("size is 0", () => {
    const h = new InputHistory();
    expect(h.size).toBe(0);
  });

  test("isNavigating is false", () => {
    expect(new InputHistory().isNavigating()).toBe(false);
  });

  test("navigateUp on empty returns undefined", () => {
    expect(new InputHistory().navigateUp()).toBeUndefined();
  });

  test("navigateDown when not navigating returns undefined", () => {
    expect(new InputHistory().navigateDown()).toBeUndefined();
  });
});

describe("InputHistory – push", () => {
  test("push adds items", () => {
    const h = new InputHistory();
    h.push("a");
    expect(h.size).toBe(1);
  });

  test("push empty string is ignored", () => {
    const h = new InputHistory();
    h.push("");
    expect(h.size).toBe(0);
  });

  test("push deduplicates consecutive identical items", () => {
    const h = new InputHistory();
    h.push("foo");
    h.push("foo");
    expect(h.size).toBe(1);
  });

  test("push same value non-consecutively is allowed", () => {
    const h = new InputHistory();
    h.push("foo");
    h.push("bar");
    h.push("foo");
    expect(h.size).toBe(3);
  });

  test("push resets navigation cursor", () => {
    const h = new InputHistory();
    h.push("a");
    h.navigateUp();
    expect(h.isNavigating()).toBe(true);
    h.push("b");
    expect(h.isNavigating()).toBe(false);
  });

  test("push of duplicate while navigating resets navigation without growing history", () => {
    const h = new InputHistory();
    h.push("a");
    h.push("b");
    h.navigateUp(); // navigating at "b"
    h.push("b"); // duplicate — should reset without adding
    expect(h.isNavigating()).toBe(false);
    expect(h.size).toBe(2);
  });
});

describe("InputHistory – navigateUp", () => {
  test("returns most-recent item on first call", () => {
    const h = new InputHistory();
    h.push("first");
    h.push("second");
    expect(h.navigateUp()).toBe("second");
  });

  test("successive calls move to older entries", () => {
    const h = new InputHistory();
    h.push("a");
    h.push("b");
    h.push("c");
    expect(h.navigateUp()).toBe("c");
    expect(h.navigateUp()).toBe("b");
    expect(h.navigateUp()).toBe("a");
  });

  test("stays at oldest entry when at boundary", () => {
    const h = new InputHistory();
    h.push("only");
    h.navigateUp(); // now at index 0
    expect(h.navigateUp()).toBe("only"); // should not go below 0
  });

  test("sets isNavigating to true", () => {
    const h = new InputHistory();
    h.push("x");
    h.navigateUp();
    expect(h.isNavigating()).toBe(true);
  });
});

describe("InputHistory – navigateDown", () => {
  test("moves forward through history", () => {
    const h = new InputHistory();
    h.push("a");
    h.push("b");
    h.push("c");
    h.navigateUp(); // c
    h.navigateUp(); // b
    expect(h.navigateDown()).toBe("c");
  });

  test("returns draft when navigating past newest entry", () => {
    const h = new InputHistory();
    h.push("a");
    h.saveDraft("draft text");
    h.navigateUp();
    const result = h.navigateDown();
    expect(result).toBe("draft text");
  });

  test("resets isNavigating when past newest entry", () => {
    const h = new InputHistory();
    h.push("a");
    h.navigateUp();
    h.navigateDown();
    expect(h.isNavigating()).toBe(false);
  });

  test("navigateDown when not navigating returns undefined", () => {
    const h = new InputHistory();
    h.push("a");
    expect(h.navigateDown()).toBeUndefined();
  });
});

describe("InputHistory – full round-trip", () => {
  test("navigate up twice, back down twice, restores draft and exits navigation", () => {
    const h = new InputHistory();
    h.push("cmd1");
    h.push("cmd2");
    h.saveDraft("partial");

    h.navigateUp(); // cmd2
    h.navigateUp(); // cmd1
    h.navigateDown(); // cmd2
    const draft = h.navigateDown(); // back to draft

    expect(draft).toBe("partial");
    expect(h.isNavigating()).toBe(false);
  });
});

describe("InputHistory – saveDraft", () => {
  test("draft is empty string initially", () => {
    const h = new InputHistory();
    h.push("a");
    h.navigateUp();
    expect(h.navigateDown()).toBe("");
  });

  test("saved draft is returned when navigating down past newest", () => {
    const h = new InputHistory();
    h.push("x");
    h.saveDraft("my draft");
    h.navigateUp();
    expect(h.navigateDown()).toBe("my draft");
  });

  test("saveDraft is ignored when already navigating (prevents draft corruption)", () => {
    const h = new InputHistory();
    h.push("x");
    h.saveDraft("original draft");
    h.navigateUp(); // now navigating
    h.saveDraft("overwrite attempt"); // should be ignored
    expect(h.navigateDown()).toBe("original draft");
  });

  test("reset clears the draft", () => {
    const h = new InputHistory();
    h.push("x");
    h.saveDraft("some draft");
    h.reset();
    h.navigateUp();
    expect(h.navigateDown()).toBe("");
  });
});

describe("InputHistory – reset", () => {
  test("reset clears navigation", () => {
    const h = new InputHistory();
    h.push("a");
    h.navigateUp();
    h.reset();
    expect(h.isNavigating()).toBe(false);
  });

  test("after reset navigateDown returns undefined", () => {
    const h = new InputHistory();
    h.push("a");
    h.navigateUp();
    h.reset();
    expect(h.navigateDown()).toBeUndefined();
  });

  test("history items are preserved after reset", () => {
    const h = new InputHistory();
    h.push("a");
    h.push("b");
    h.reset();
    expect(h.size).toBe(2);
  });
});
