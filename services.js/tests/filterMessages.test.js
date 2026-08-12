const test = require("node:test");
const assert = require("node:assert/strict");

const {
    filterProtectedSenders,
    prepareMessagesForAI,
} = require("../filterMessages");


// Creates a Gmail message that has already passed the Gmail query.
// Each test can override only the field it needs.
function createMessage(overrides = {}) {
    return {
        gmailMessageId: "message-1",
        threadId: "thread-1",
        senderEmail: "sender@example.com",
        senderName: "Example Sender",
        receivedAt: "2026-07-01T12:00:00Z",
        subject: "Example subject",
        snippet: "Example snippet",
        ...overrides,
    };
}

test("keeps messages whose senders are not protected", () => {
    const message = createMessage();

    const result = filterProtectedSenders(
        [message],
        [{ senderEmail: "friend@example.com" }]
    );

    assert.equal(result.candidates.length, 1);
    assert.strictEqual(result.candidates[0], message);
    assert.deepEqual(result.excluded, []);

    assert.deepEqual(result.counts, {
        fetchedCount: 1,
        candidateCount: 1,
        protectedCount: 0,
    });
});


test("excludes a protected sender regardless of casing", () => {
    const result = filterProtectedSenders(
        [
            createMessage({
                senderEmail: "Friend@Example.com",
            }),
        ],
        [{ senderEmail: "friend@example.com" }]
    );

    assert.deepEqual(result.candidates, []);
    assert.deepEqual(result.excluded, [
        {
            gmailMessageId: "message-1",
            reason: "protected_sender",
        },
    ]);

    assert.equal(result.counts.protectedCount, 1);

});


test("accepts protected senders returned as database objects", () => {
    const result = filterProtectedSenders(
        [createMessage()],
        [
            {
                senderEmail: "sender@example.com",
            },
        ]
    );

    assert.equal(result.candidates.length, 0);
    assert.equal(result.counts.protectedCount, 1);
});


test("does not repeat Gmail query filtering", () => {
    const message = createMessage({
        isUnread: false,
        isStarred: true,
        isImportant: true,
        receivedAt: "2026-08-11T12:00:00Z",
    });

    const result = filterProtectedSenders([message]);

    // Gmail owns unread, date, starred, and important filtering.
    // This function looks only at the protected-sender list.
    assert.equal(result.candidates.length, 1);
    assert.strictEqual(result.candidates[0], message);
});

test("prepares bounded AI input without modifying the original", () => {
    const message = createMessage({
        senderEmail: "LOUD@Sender.com",
        senderName: "N".repeat(150),
        subject: "S".repeat(250),
        snippet: "X".repeat(1500),
    });

    const [aiMessage] = prepareMessagesForAI([message]);

    assert.deepEqual(
        Object.keys(aiMessage),
        [
            "gmailMessageId",
            "threadId",
            "senderEmail",
            "senderName",
            "subject",
            "snippet",
            "receivedAt",
        ]
    );

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