async function sendQuery() {
    const inputField = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");

    const query = inputField.value.trim();
    if (!query) return;

    chatBox.innerHTML += `<p><strong>You:</strong> ${query}</p>`;
    inputField.value = "";

    try {
        const response = await fetch("https://naturopathy.onrender.com/fetch_naturopathy_results", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": "gR4k#82GJ!nani2025"   // IMPORTANT
            },
            body: JSON.stringify({
                query: query,
                match_threshold: 0.4,
                match_count: 3
            })
        });

        const data = await response.json();

        const answer = data.summary || "No naturopathy results found.";
        chatBox.innerHTML += `<p><strong>Nani-AI:</strong><br>${answer}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (e) {
        chatBox.innerHTML += `<p><strong>Error:</strong> Could not connect to API.</p>`;
    }
}
