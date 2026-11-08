import { createUniversity } from "@/api/admin";
import { login } from "@/api/auth";
import { ApiFailure, apiMessage, request } from "@/api/client";
import { describeError } from "@/app/providers";
import { z } from "zod";

const respond = (status: number, body: unknown) =>
  vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));

const failure = async () => {
  try {
    await request("/anything", z.object({}));
  } catch (error) {
    return error as ApiFailure;
  }
  throw new Error("expected the request to fail");
};

describe("API error messages", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the message of a failed response", async () => {
    respond(400, { success: false, message: "Invalid pagination.", data: null, errors: null });
    const error = await failure();
    expect(error.detail).toEqual({ kind: "server", status: 400 });
    expect(describeError(error)).toBe("Invalid pagination.");
  });

  it("keeps the validation details with the summary", async () => {
    respond(400, {
      success: false,
      message: "Validation failed",
      data: null,
      errors: ["PageNumber: The value 'abc' is not valid for PageNumber."],
    });
    expect(describeError(await failure())).toBe(
      "Validation failed: PageNumber: The value 'abc' is not valid for PageNumber.",
    );
  });

  it("keeps the message on 401 and 404 without changing the error kind", async () => {
    respond(401, { success: false, message: "Wrong password.", data: null, errors: null });
    const unauthorized = await failure();
    expect(unauthorized.detail).toEqual({ kind: "unauthorized" });
    expect(describeError(unauthorized)).toBe("Wrong password.");
    vi.restoreAllMocks();

    respond(404, { success: false, message: "User not found.", data: null, errors: null });
    const notFound = await failure();
    expect(notFound.detail).toEqual({ kind: "not_found" });
    expect(describeError(notFound)).toBe("User not found.");
  });

  it("keeps the message of a 200 response that reports failure", async () => {
    respond(200, { success: false, message: "Code already exists.", data: null, errors: null });
    await expect(createUniversity({ code: "X", name: "X" })).rejects.toMatchObject({
      serverMessage: "Code already exists.",
    });
  });

  it("keeps the message of a rejected sign-in", async () => {
    respond(200, { success: false, message: "Account is inactive.", data: null, errors: [] });
    await expect(login({ identifier: "user", password: "secret" })).rejects.toMatchObject({
      detail: { kind: "unauthorized" },
      serverMessage: "Account is inactive.",
    });
  });

  it("falls back to the default text when the body says nothing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
    const empty = await failure();
    expect(empty.serverMessage).toBeUndefined();
    expect(describeError(empty)).toBe(describeError(new ApiFailure({ kind: "server", status: 500 })));
  });

  it("reads message-only, errors-only and unrelated bodies", () => {
    expect(apiMessage({ message: "Exam in progress." })).toBe("Exam in progress.");
    expect(apiMessage({ errors: ["A", "B"] })).toBe("A; B");
    expect(apiMessage({ message: "Blocked.", errors: ["CODE"] })).toBe("Blocked. CODE");
    expect(apiMessage({ message: null, errors: [] })).toBeUndefined();
    expect(apiMessage("<html>")).toBeUndefined();
  });
});
