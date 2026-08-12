
function filterProtectedSenders(
    messages,
    protectedSenders = []
) {

    // Create a Set of normalized protected email addresses.
    // Protected senders may be strings or database objects.
    const protectedEmails = new Set(
        protectedSenders.map((sender) => sender.senderEmail)
    );

    const candidates = [];
    const excluded = [];



    for (const message of messages) {
        const normalizedSenderEmail = message.senderEmail
            .trim()
            .toLowerCase();


        if (protectedEmails.has(normalizedSenderEmail)) {
            excluded.push({
                gmailMessageId:
                    message?.gmailMessageId,
                reason: "protected_sender",
            });
            continue;
        }

        // Preserve the original object and original email casing.
        candidates.push(message);
    }

    return {
        candidates,
        excluded,
        counts: {
            fetchedCount: messages.length,
            candidateCount: candidates.length,
            protectedCount: excluded.length,
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
    filterProtectedSenders,
    prepareMessagesForAI,
};
