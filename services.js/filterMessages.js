//  * Separates fetched Gmail messages into:
//  * - candidates that can continue through the workflow
//  * - excluded messages sent by protected senders
//  * - counts that summarize the results


function filterProtectedSenders(
    messages,
    protectedSenders = []
) {

    // Build a lookup set from the protected-sender records.
    // Each record is expected to provide a senderEmail value.
    const protectedEmails = new Set(
        protectedSenders.map((sender) => sender.senderEmail)
    );
    // Store messages in separate groups for later processing or reporting.
    const candidates = [];
    const excluded = [];


    // Create a Set of normalized protected email addresses.
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
            // Do not add protected messages to the candidate list.
            continue;
        }

        // Keep the original message object for later processing.
        candidates.push(message);
    }
    // Return both message groups and summary counts for the caller.
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


// Trims text and limits its length before it is sent to an AI provider.
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
    // Treat invalid input as an empty list so this function always returns an array
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
