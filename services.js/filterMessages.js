// Makes email addresses lowercase so comparisons are consistent.
// This is used only for matching and does not modify the original email.
function normalizeEmail(value) {
    return typeof value === "string"
        ? value.trim().toLowerCase()
        : "";
}

function filterMessages(
    messages,
    {
        olderThanDays = 15,
        protectedSenders = [],
        now = new Date(),
    } = {}
) {
    // Invalid filter settings are programming/configuration errors.
    // Failing here prevents the filter from accidentally allowing
    // every message through.
    if (
        !Number.isFinite(olderThanDays) ||
        olderThanDays <= 0
    ) {
        throw new TypeError(
            "olderThanDays must be a positive number"
        );
    }

    const nowTime = new Date(now).getTime();

    if (!Number.isFinite(nowTime)) {
        throw new TypeError("now must be a valid date");
    }

    // If protectedSenders is malformed, use an empty array
    // instead of crashing while calling .map().
    const safeProtectedSenders = Array.isArray(protectedSenders)
        ? protectedSenders
        : [];

    // Create a Set of normalized protected email addresses.
    // Protected senders may be strings or database objects.
    const protectedEmails = new Set(
        safeProtectedSenders
            .map((sender) => {
                if (typeof sender === "string") {
                    return sender;
                }

                if (
                    sender &&
                    typeof sender === "object"
                ) {
                    return sender.senderEmail;
                }

                return "";
            })
            .map(normalizeEmail)
            .filter(Boolean)
    );

    // Calculate the timestamp representing exactly
    // olderThanDays before the current time.
    const cutoffTime =
        nowTime -
        olderThanDays * 24 * 60 * 60 * 1000;

    const candidates = [];
    const excluded = [];
    const excludedByReason = {};
    const seenIds = new Set();

    // Invalid message input becomes an empty batch.
    const safeMessages = Array.isArray(messages)
        ? messages
        : [];

    // Records only the message ID and reason.
    // This avoids carrying unnecessary excluded email content.
    function excludeMessage(messageId, reason) {
        excluded.push({
            gmailMessageId: messageId || null,
            reason,
        });

        excludedByReason[reason] =
            (excludedByReason[reason] || 0) + 1;
    }

    // Examine every Gmail message independently.
    for (const message of safeMessages) {
        const messageId =
            typeof message?.gmailMessageId === "string"
                ? message.gmailMessageId.trim()
                : "";

        // A Gmail ID is required for tracking and later actions.
        if (!messageId) {
            excludeMessage(null, "invalid_message_id");
            continue;
        }

        // Prevent duplicate IDs inside this batch.
        if (seenIds.has(messageId)) {
            excludeMessage(messageId, "duplicate");
            continue;
        }

        seenIds.add(messageId);

        // The sender is required because we cannot safely check
        // the protected-sender list without it.
        const normalizedSenderEmail = normalizeEmail(
            message.senderEmail
        );

        if (
            !normalizedSenderEmail ||
            !normalizedSenderEmail.includes("@")
        ) {
            excludeMessage(
                messageId,
                "invalid_sender_email"
            );
            continue;
        }

        // Require the Gmail adapter to provide all three labels.
        // Missing starred or important data should not be treated
        // as false because that could allow an unsafe candidate.
        const hasValidLabelMetadata =
            typeof message.isUnread === "boolean" &&
            typeof message.isStarred === "boolean" &&
            typeof message.isImportant === "boolean";

        if (!hasValidLabelMetadata) {
            excludeMessage(
                messageId,
                "invalid_label_metadata"
            );
            continue;
        }

        // Protected senders are excluded before the other rules
        // so they are included in protectedCount.
        if (protectedEmails.has(normalizedSenderEmail)) {
            excludeMessage(messageId, "protected_sender");
            continue;
        }

        // Stage 1 only considers unread messages.
        if (message.isUnread !== true) {
            excludeMessage(messageId, "not_unread");
            continue;
        }

        const receivedTime = new Date(
            message.receivedAt
        ).getTime();

        // Do not process messages with unusable dates.
        if (!Number.isFinite(receivedTime)) {
            excludeMessage(
                messageId,
                "invalid_received_at"
            );
            continue;
        }

        // Exactly 15 days old is not older than 15 days.
        // Only messages beyond the cutoff become candidates.
        if (receivedTime >= cutoffTime) {
            excludeMessage(messageId, "too_recent");
            continue;
        }

        if (message.isStarred === true) {
            excludeMessage(messageId, "starred");
            continue;
        }

        if (message.isImportant === true) {
            excludeMessage(messageId, "important");
            continue;
        }

        // Preserve the original object and original email casing.
        candidates.push(message);
    }

    return {
        candidates,
        excluded,
        counts: {
            fetchedCount: safeMessages.length,
            candidateCount: candidates.length,
            protectedCount:
                excludedByReason.protected_sender || 0,
            excludedCount: excluded.length,
            excludedByReason,
        },
    };
}


// Limits text sent to the eventual AI provider.
function trimText(value, maxCharacters) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, maxCharacters);
}


// Creates a smaller AI-ready object without modifying
// the original candidate.
function prepareMessagesForAI(
    candidates,
    {
        maxSenderNameCharacters = 100,
        maxSubjectCharacters = 200,
        maxSnippetCharacters = 1200,
    } = {}
) {
    const safeCandidates = Array.isArray(candidates)
        ? candidates
        : [];

    return safeCandidates.map((message) => ({
        gmailMessageId: message.gmailMessageId,
        threadId: message.threadId,

        // Preserve casing because unusual casing may be
        // a useful classification signal.
        senderEmail: message.senderEmail,

        senderName: trimText(
            message.senderName,
            maxSenderNameCharacters
        ),

        subject: trimText(
            message.subject,
            maxSubjectCharacters
        ),

        snippet: trimText(
            message.snippet,
            maxSnippetCharacters
        ),

        receivedAt: message.receivedAt,
    }));
}


module.exports = {
    filterMessages,
    prepareMessagesForAI,
};