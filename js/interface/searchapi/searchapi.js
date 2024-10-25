async function generateKeywords(message, count, specificContext = null, node = null) {
    const lastPromptsAndResponses = specificContext || getLastPromptsAndResponses(2, 150);
    const isEmpty = !lastPromptsAndResponses || !/\S/.test(lastPromptsAndResponses);

    if (isEmpty) {
        return message
            .split(' ')
            .filter(word => word.trim().length > 0)
            .sort((a, b) => b.length - a.length)
            .slice(0, count)
            .map(word => word.trim());
    }

    const messages = [
        {
            role: "system",
            content: `Recent conversation:${lastPromptsAndResponses}`,
        },
        {
            role: "system",
            content: "Provide three single-word keywords relevant to the latest user message. Enclose each keyword in quotations and separate them with commas.",
        },
        {
            role: "user",
            content: `${message}`,
        },
    ];

    let response;
    if (node) {
        response = await callchatLLMnode(messages, node, false, 0);
    } else {
        response = await callchatAPI(messages, false, 0);
    }

    console.log("Generate Keywords Ai Response:", response);

    const regex = /"(.*?)"/g;
    const keywords = [];
    let match;
    while (match = regex.exec(response)) {
        keywords.push(match[1].trim());
    }

    console.log("Keywords:", keywords);
    return keywords;
}

function isGoogleSearchEnabled(nodeIndex = null) {
    if (nodeIndex !== null) {
        // Check for AI node-specific checkboxes
        const aiCheckbox = Elem.byId('google-search-checkbox-' + nodeIndex);
        if (aiCheckbox) return aiCheckbox.checked;
    }

    const globalCheckbox = Elem.byId('google-search-checkbox');
    return (globalCheckbox ? globalCheckbox.checked : false);
}

// console.log("Sending context to AI:", messages);
async function performSearch(searchQuery) {
    console.log("Search Query in processLinkInput:", searchQuery);

    const apiKey = Elem.byId('googleApiKey').value;
    const searchEngineId = Elem.byId('googleSearchEngineId').value;
    if (!apiKey || !searchEngineId) {
        alert('API Key or Search Engine ID is missing. Please enter them.');
        return null;
    }

    const response = await Request.send(new performSearch.ct(apiKey, searchEngineId, searchQuery));
    if (response) {
        const data = await response.json();
        //console.log('Received data:', data);

        return data;
    } else {
        alert("Failed to fetch search results. Please check your API key, search engine ID, and ensure your Google Cloud project is properly configured.");
        return null;
    }
}
performSearch.ct = class {
    constructor(apiKey, searchEngineId, searchQuery){
        this.url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURI(searchQuery)}`;
        //console.log("Request URL:", this.url);
    }
    onFailure(){ return "Failed to fetch search results:" }
}

async function constructSearchQuery(userMessage, recentContext = null, node = null) {
    if (String.isUrl(userMessage)) {
        Elem.byId('prompt').value = '';
        const linkNode = LinkNode.create(userMessage, userMessage);
        setupNodeForPlacement(linkNode);
        return null;
    }

    recentContext = recentContext || getLastPromptsAndResponses(2, 150);
    const queryContext = [
        {
            role: "system",
            content: `Recent conversation context: \n${recentContext}`
        },
        {
            role: "system",
            content: "Without unnecessary preface or summary... From the provided context history, predict a relevant search query within quotation marks."
        },
        {
            role: "user",
            content: userMessage
        }
    ];

    try {
        let apiResponse;
        if (node) {
            apiResponse = await callchatLLMnode(queryContext, node, false, 0);
        } else {
            apiResponse = await callchatAPI(queryContext, false, 0);
        }

        const extractedQuery = apiResponse.match(/"([^"]*)"/);
        const searchQuery = extractedQuery ? extractedQuery[1] : apiResponse;
        console.log("Search Query:", searchQuery);

        if (!searchQuery || searchQuery.trim().length === 0) {
            console.warn("Received empty search query, using user message as fallback.");
            return userMessage;
        }
        return searchQuery;
    } catch (error) {
        console.error("Error generating search query:", error);
        return userMessage;
    }
}

async function getRelevantSearchResults(userMessage, searchResults, topN = 5) {
    const fetchEmbeddings = Embeddings.fetch;
    const userMessageEmbedding = await fetchEmbeddings(userMessage);

    const searchResultEmbeddings = await Promise.all(
        searchResults.map(async result => {
            const titleAndDescription = result.title + " " + result.description;
            const embedding = await fetchEmbeddings(titleAndDescription);
            return {
                result,
                embedding
            };
        })
    );

    searchResultEmbeddings.forEach(resultEmbedding => {
        resultEmbedding.similarity = cosineSimilarity(userMessageEmbedding, resultEmbedding.embedding);
    });

    searchResultEmbeddings.sort((a, b) => b.similarity - a.similarity);

    // Return the top N search results
    return searchResultEmbeddings.slice(0, topN).map(resultEmbedding => resultEmbedding.result);
}

function processSearchResults(results) {
    if (!results || !results.items || !Array.isArray(results.items)) return [];

    const formattedResults = results.items.map(item => {
        return {
            title: item.title,
            link: item.link,
            description: item.snippet
        };
    });

    return (Array.isArray(formattedResults) ? formattedResults : "No results found");
}

function displaySearchResult(result){
    const description = String.dotTruncToLength(result.description, 500);
    const node = LinkNode.create(result.link, result.title, description);
    setupNodeForPlacement(node); // Attach to the user's mouse
}
async function displayResultsRelevantToMessage(searchResults, message){
    const relevantResults = await getRelevantSearchResults(message, searchResults);
    relevantResults.forEach(displaySearchResult);
}

function returnLinkNodes() {
    const linkUrl = prompt("Enter a Link or Search Query", '');
    if (linkUrl) processLinkInput(linkUrl);
}

    //for interface.js link node drop handler
function processLinkInput(linkUrl) {
    if (String.isUrl(linkUrl)) {
        const node = LinkNode.create(linkUrl, linkUrl);
        setupNodeForPlacement(node);
    } else {
        return handleNaturalLanguageSearch(linkUrl)
    }
}

async function handleNaturalLanguageSearch(query) {
    if (query === null) return;

    const searchResultsData = await performSearch(query);
    if (!searchResultsData) return;

    const searchResults = processSearchResults(searchResultsData);
    await displayResultsRelevantToMessage(searchResults, query);
}
