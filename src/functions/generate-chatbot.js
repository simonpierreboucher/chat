const fs = require('fs-extra');
const path = require('path');

exports.handler = async (event) => {
    console.log('Received event:', event);
    try {
        const { title, systemMessage, apiKey, headerColor, userMessageColor, botMessageColor } = JSON.parse(event.body);

        console.log('Parsed body:', { title, systemMessage, apiKey, headerColor, userMessageColor, botMessageColor });

        const chatbotHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            background-color: #f4f4f4;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }
        .chat-container {
            width: 100%;
            height: calc(100vh - 40px);
            background: #fff;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
            flex-direction: column;
        }
        .chat-header {
            background: ${headerColor};
            color: white;
            padding: 10px;
            text-align: center;
        }
        .chat-box {
            flex-grow: 1;
            overflow-y: scroll;
            padding: 10px;
        }
        .chat-message {
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            background: #f1f1f1;
        }
        .chat-message.bot {
            background: ${botMessageColor};
        }
        .chat-message.user {
            background: ${userMessageColor};
            text-align: right;
        }
        .chat-input {
            display: flex;
            border-top: 1px solid #ddd;
        }
        .chat-input input {
            flex: 1;
            padding: 10px;
            border: none;
            outline: none;
        }
        .chat-input button {
            padding: 10px;
            background: ${headerColor};
            color: white;
            border: none;
            cursor: pointer;
        }
        .chat-input button:hover {
            background: ${headerColor};
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">${title}</div>
        <div class="chat-box" id="chat-box"></div>
        <div class="chat-input">
            <input type="text" id="user-input" placeholder="Type your message here..." onkeydown="checkEnter(event)">
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>
    <script>
        let messages = [];

        function checkEnter(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        async function sendMessage() {
            const userInput = document.getElementById('user-input').value;
            if (!userInput) return;

            addMessageToChatBox('user', userInput, '${userMessageColor}');
            document.getElementById('user-input').value = '';

            messages.push({ role: 'user', content: userInput });

            const botMessageElement = addMessageToChatBox('bot', '', '${botMessageColor}');
            const response = await getGPT4Response(messages);
            messages.push({ role: 'assistant', content: response });

            streamFormattedText(botMessageElement, response);
        }

        function addMessageToChatBox(sender, message, color) {
            const chatBox = document.getElementById('chat-box');
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', sender);
            messageElement.style.backgroundColor = color;
            messageElement.innerHTML = marked.parse(message);
            chatBox.appendChild(messageElement);
            chatBox.scrollTop = chatBox.scrollHeight;
            MathJax.typesetPromise();
            return messageElement;
        }

        function streamFormattedText(element, text) {
            let index = 0;
            function type() {
                if (index < text.length) {
                    element.innerHTML = marked.parse(text.substring(0, index + 1));
                    index++;
                    setTimeout(type, 30);
                    MathJax.typesetPromise();
                }
            }
            type();
        }

        async function getGPT4Response(messages) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer ${apiKey}\`
                    },
                    body: JSON.stringify({
                        model: "gpt-4",
                        messages: messages,
                        max_tokens: 150
                    })
                });

                if (!response.ok) {
                    console.error('Error:', response.status, response.statusText);
                    const errorDetails = await response.text();
                    console.error('Error details:', errorDetails);
                    return \`Error: \${response.statusText}\`;
                }

                const data = await response.json();
                console.log('API Response:', data);
                return data.choices && data.choices.length > 0 ? data.choices[0].message.content.trim() : 'No response from OpenAI.';
            } catch (error) {
                console.error('Fetch error:', error);
                return 'Error: Unable to get response from OpenAI.';
            }
        }
    </script>
</body>
</html>`;

        const fileName = `${Date.now()}.html`;
        const filePath = path.join(__dirname, `../generated-chatbots/${fileName}`);

        console.log('Writing file to:', filePath);

        await fs.outputFile(filePath, chatbotHtml);

        console.log(`Chatbot HTML generated at: ${filePath}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ url: `/generated-chatbots/${fileName}` }),
        };
    } catch (error) {
        console.error('Error generating chatbot:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error generating chatbot' }),
        };
    }
};
