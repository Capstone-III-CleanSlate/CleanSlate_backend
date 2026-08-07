const test = require("node:test");
const assert = require("node:assert/strict");

const {
    filterMessages,
    prepareMessagesForAI,
} = require("../services/filterMessages");


// Using a fixed date keeps age-related tests predictable.
const now = new Date("2026-08-07T12:00:00Z");


// Creates a valid cleanup candidate.
// Each test can override only the field it needs.
function createMessage(overrides = {}) {
    return {
        gmailMessageId: "message-1",
        senderEmail: "sender@example.com",
        senderName: "Example Sender",
        receivedAt: "2026-07-01T12:00:00Z",
        isUnread: true,
        isStarred: false,
        isImportant: false,
        subject: "Example subject",
        snippet: "Example snippet",
        ...overrides,
    };
}


test("keeps a message that passes every filtering rule", () => {
    const message = createMessage({
        senderEmail: "LOUD@Sender.com",
    });

    const result = filterMessages(
        [message],
        {
            now,
            protectedSenders: ["friend@example.com"],
        }
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.counts.fetchedCount, 1);
    assert.equal(result.counts.candidateCount, 1);
    assert.equal(result.counts.excludedCount, 0);

    // Original sender casing should remain unchanged.
    assert.equal(
        result.candidates[0].senderEmail,
        "LOUD@Sender.com"
    );

    // The filter returns the original message object.
    assert.strictEqual(result.candidates[0], message);
});


test("excludes a protected sender regardless of casing", () => {
    const result = filterMessages(
        [
            createMessage({
                senderEmail: "Friend@Example.com",
            }),
        ],
        {
            now,

            // This also tests the database-object format.
            protectedSenders: [
                {
                    senderEmail: "friend@example.com",
                },
            ],
        }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.counts.protectedCount, 1);
    assert.equal(
        result.counts.excludedByReason.protected_sender,
        1
    );

    assert.deepEqual(result.excluded[0], {
        gmailMessageId: "message-1",
        reason: "protected_sender",
    });
});


test("excludes read, recent, starred, and important messages", () => {
    const result = filterMessages(
        [
            createMessage({
                gmailMessageId: "read-message",
                isUnread: false,
            }),
            createMessage({
                gmailMessageId: "recent-message",
                receivedAt: "2026-08-01T12:00:00Z",
            }),
            createMessage({
                gmailMessageId: "starred-message",
                isStarred: true,
            }),
            createMessage({
                gmailMessageId: "important-message",
                isImportant: true,
            }),
        ],
        { now }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.counts.fetchedCount, 4);
    assert.equal(result.counts.excludedCount, 4);

    assert.equal(
        result.counts.excludedByReason.not_unread,
        1
    );

    assert.equal(
        result.counts.excludedByReason.too_recent,
        1
    );

    assert.equal(
        result.counts.excludedByReason.starred,
        1
    );

    assert.equal(
        result.counts.excludedByReason.important,
        1
    );
});


test("excludes duplicate Gmail message IDs", () => {
    const message = createMessage();

    const result = filterMessages(
        [
            message,
            { ...message },
        ],
        { now }
    );

    assert.equal(result.candidates.length, 1);
    assert.equal(result.counts.excludedCount, 1);
    assert.equal(
        result.counts.excludedByReason.duplicate,
        1
    );
});


test("excludes a message with a missing Gmail ID", () => {
    const result = filterMessages(
        [
            createMessage({
                gmailMessageId: "",
            }),
        ],
        { now }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(
        result.counts.excludedByReason.invalid_message_id,
        1
    );

    assert.deepEqual(result.excluded[0], {
        gmailMessageId: null,
        reason: "invalid_message_id",
    });
});


test("excludes a message with an invalid sender email", () => {
    const result = filterMessages(
        [
            createMessage({
                senderEmail: "not-an-email-address",
            }),
        ],
        { now }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(
        result.counts.excludedByReason.invalid_sender_email,
        1
    );
});


test("excludes a message with missing Gmail label metadata", () => {
    const result = filterMessages(
        [
            createMessage({
                isImportant: undefined,
            }),
        ],
        { now }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(
        result.counts.excludedByReason.invalid_label_metadata,
        1
    );
});


test("excludes a message with an invalid received date", () => {
    const result = filterMessages(
        [
            createMessage({
                receivedAt: "not-a-valid-date",
            }),
        ],
        { now }
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(
        result.counts.excludedByReason.invalid_received_at,
        1
    );
});


test("requires a message to be more than exactly 15 days old", () => {
    const exactlyFifteenDaysOld = createMessage({
        gmailMessageId: "exact-cutoff",
        receivedAt: "2026-07-23T12:00:00Z",
    });

    const justOlderThanFifteenDays = createMessage({
        gmailMessageId: "older-than-cutoff",
        receivedAt: "2026-07-23T11:59:59.999Z",
    });

    const result = filterMessages(
        [
            exactlyFifteenDaysOld,
            justOlderThanFifteenDays,
        ],
        {
            now,
            olderThanDays: 15,
        }
    );

    assert.equal(result.candidates.length, 1);

    assert.equal(
        result.candidates[0].gmailMessageId,
        "older-than-cutoff"
    );

    assert.equal(
        result.counts.excludedByReason.too_recent,
        1
    );
});


test("returns an empty result for non-array message input", () => {
    const result = filterMessages(null, { now });

    assert.deepEqual(result.candidates, []);
    assert.deepEqual(result.excluded, []);
    assert.equal(result.counts.fetchedCount, 0);
    assert.equal(result.counts.candidateCount, 0);
    assert.equal(result.counts.excludedCount, 0);
});


test("throws an error for invalid filter settings", () => {
    assert.throws(
        () => {
            filterMessages([], {
                now,
                olderThanDays: 0,
            });
        },
        /olderThanDays must be a positive number/
    );

    assert.throws(
        () => {
            filterMessages([], {
                now: "not-a-valid-date",
            });
        },
        /now must be a valid date/
    );
});


test("prepares bounded AI input without modifying the original", () => {
    const message = createMessage({
        senderEmail: "LOUD@Sender.com",
        senderName: "N".repeat(150),
        subject: "S".repeat(250),
        snippet: "X".repeat(1500),
    });

    const [aiMessage] = prepareMessagesForAI([message]);

    // Preserve potentially meaningful casing.
    assert.equal(
        aiMessage.senderEmail,
        "LOUD@Sender.com"
    );

    // Enforce the configured character limits.
    assert.equal(aiMessage.senderName.length, 100);
    assert.equal(aiMessage.subject.length, 200);
    assert.equal(aiMessage.snippet.length, 1200);

    // The original Gmail message remains unchanged.
    assert.equal(message.senderName.length, 150);
    assert.equal(message.subject.length, 250);
    assert.equal(message.snippet.length, 1500);
});


test("returns an empty AI payload for invalid candidate input", () => {
    const result = prepareMessagesForAI(null);

    assert.deepEqual(result, []);
});