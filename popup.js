export async function generateGeminiTasks(username, repoName) {
  try {
    const response = await fetch('https://proxy.tune.app/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: '',
      },
      body: JSON.stringify({
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: `Generate tasks for improving the GitHub repository https://github.com/${username}/${repoName}. Include a list of 10 tasks which are not already implemented in this codebase and needed to be implemented.`,
          },
        ],
        model: 'kaushikaakash04/tune-blob',
        stream: false,
        frequency_penalty: 0,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content; // Ensure this returns a string of tasks
  } catch (error) {
    throw new Error(`Gemini API error: ${error.message}`);
  }
}

async function fetchAndHandleRepoData(username, repoName) {
  try {
    const repoData = await fetchRepoData(username, repoName);
    const sizeData = await fetchRepoSize(username, repoName);

    return { repoData, sizeData };
  } catch (error) {
    return { error: `Error fetching data: ${error.message}` };
  }
}

function displayRepoResults(username, repoName, sizeData) {
  const pythonData = sizeData.find((lang) => lang.language === 'Python');
  const totalSize = sizeData.find((lang) => lang.language === 'Total');

  document.getElementById('results').innerText = `
    Repo: ${username}/${repoName}
    Size: ${totalSize ? totalSize.linesOfCode : 'N/A'} lines
    Python Lines: ${pythonData ? pythonData.linesOfCode : 'N/A'}
    
  `;
}

function storeRepoDataIfNeeded(username, repoName, pythonData) {
  if (pythonData && pythonData.linesOfCode > 5000) {
    const storedLinks = JSON.parse(localStorage.getItem('githubLinks')) || [];
    const repoUrl = `https://github.com/${username}/${repoName}`;
    const repoEntry = { url: repoUrl, pythonLines: pythonData.linesOfCode };

    if (!storedLinks.some((link) => link.url === repoUrl)) {
      storedLinks.push(repoEntry);
      localStorage.setItem('githubLinks', JSON.stringify(storedLinks));
    }
  }
}

function renderLinks() {
  const storedLinks = JSON.parse(localStorage.getItem('githubLinks')) || [];
  const linksContainer = document.getElementById('links-container');
  linksContainer.innerHTML = '';

  storedLinks.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.textContent = `${link.url} (Python Lines: ${link.pythonLines})`;
    a.target = '_blank';
    a.className = 'link-item';
    li.appendChild(a);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', () => {
      const updatedLinks = storedLinks.filter((l) => l.url !== link.url);
      localStorage.setItem('githubLinks', JSON.stringify(updatedLinks));
      renderLinks(); // Re-render the links
    });

    li.appendChild(removeButton);
    linksContainer.appendChild(li);
  });

  // Show or hide the links container based on the number of links
  linksContainer.style.display = storedLinks.length > 0 ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  renderLinks();
  displayCurrentTime(); // Call the function to display the current time
  const storedLinks = JSON.parse(localStorage.getItem('githubLinks')) || [];

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(
      activeTab.id,
      { message: 'getRepoDetails' },
      async (response) => {
        if (response && response.repoUrl) {
          document.getElementById('repo-url').value = response.repoUrl;
          const urlParts = response.repoUrl.split('github.com/')[1].split('/');
          const username = urlParts[0];
          const repoName = urlParts[1];

          // Check if the link is already stored
          const existingLink = storedLinks.find(
            (link) => link.url === response.repoUrl
          );
          if (existingLink) {
            document.getElementById('results').innerText = `
            Repo: ${username}/${repoName}
            Size: N/A lines
            Python Lines: ${existingLink.pythonLines}
  
          `;
          } else {
            const { sizeData, error } = await fetchAndHandleRepoData(
              username,
              repoName
            );
            if (error) {
              document.getElementById('results').innerText = error;
            } else {
              displayRepoResults(username, repoName, sizeData);
              storeRepoDataIfNeeded(
                username,
                repoName,
                sizeData.find((lang) => lang.language === 'Python')
              );
            }
          }
        } else {
          document.getElementById('results').innerText =
            'Not a GitHub repository page.';
        }
      }
    );
  });

  document.getElementById('analyze').addEventListener('click', async () => {
    const repoUrl = document.getElementById('repo-url').value;
    if (repoUrl) {
      const urlParts = repoUrl.split('github.com/')[1].split('/');
      const username = urlParts[0];
      const repoName = urlParts[1];

      // Check if the link is already stored
      if (!storedLinks.some((link) => link.url === repoUrl)) {
        storedLinks.push(repoUrl);
        localStorage.setItem('githubLinks', JSON.stringify(storedLinks));
      }

      const { sizeData, error } = await fetchAndHandleRepoData(
        username,
        repoName
      );
      if (error) {
        document.getElementById('results').innerText = error;
      } else {
        displayRepoResults(username, repoName, sizeData);
        storeRepoDataIfNeeded(
          username,
          repoName,
          sizeData.find((lang) => lang.language === 'Python')
        );
      }
    }
  });

  document
    .getElementById('generate-tasks')
    .addEventListener('click', async () => {
      const repoUrl = document.getElementById('repo-url').value;
      if (repoUrl) {
        const urlParts = repoUrl.split('github.com/')[1].split('/');
        const username = urlParts[0];
        const repoName = urlParts[1];

        // Show loading indicator
        document.getElementById('results').innerText = 'Loading...';

        try {
          const response = await generateGeminiTasks(username, repoName);

          // Assuming the response is a string of tasks
          const tasks = response
            .split('\n')
            .filter((task) => task.trim() !== '');

          // Clear previous results
          const resultsContainer = document.getElementById('results');
          resultsContainer.innerHTML = `
          <strong>Suggested Tasks:</strong>
        `;

          // Create a container for tasks
          const taskContainer = document.createElement('div');
          taskContainer.className = 'task-container';

          tasks.forEach((task, index) => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task';
            taskDiv.innerHTML = `<strong>${index + 1}. ${task}</strong>`;
            taskContainer.appendChild(taskDiv);
          });

          resultsContainer.appendChild(taskContainer);

          // Add button to insert tasks into the todo list
          const insertButton = document.createElement('button');
          insertButton.innerText = 'Add Tasks to Todo';
          insertButton.addEventListener('click', () => {
            const todos = JSON.parse(localStorage.getItem('todos')) || [];
            tasks.forEach((task) => {
              todos.push({
                text: task,
                dueDate: '',
                priority: 'medium',
                category: '',
                completed: false,
              });
            });
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos(todos);
          });

          resultsContainer.appendChild(insertButton);
        } catch (error) {
          document.getElementById(
            'results'
          ).innerText = `Error: ${error.message}`;
        }
      } else {
        document.getElementById('results').innerText =
          'Please enter a valid GitHub repository URL.';
      }
    });

  // Load todos from localStorage when the page loads
  const todos = JSON.parse(localStorage.getItem('todos')) || [];
  renderTodos(todos);

  // Function to render todos
  function renderTodos(todos) {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';

    todos.forEach((todo, index) => {
      const li = document.createElement('li');
      li.textContent = `${todo.text} (Due: ${todo.dueDate}, Priority: ${todo.priority}, Category: ${todo.category})`;
      li.style.textDecoration = todo.completed ? 'line-through' : 'none';

      // Add complete button
      const completeButton = document.createElement('button');
      completeButton.textContent = '✔️';
      completeButton.addEventListener('click', () => {
        todo.completed = !todo.completed;
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos(todos);
      });

      // Add delete button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = '❌';
      deleteButton.addEventListener('click', () => {
        todos.splice(index, 1);
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos(todos);
      });

      li.appendChild(completeButton);
      li.appendChild(deleteButton);
      todoList.appendChild(li);
    });
  }

  document.getElementById('add-todo').addEventListener('click', () => {
    const newTodo = document.getElementById('todo-input').value.trim();
    const dueDate = document.getElementById('due-date').value;
    const priority = document.getElementById('priority-select').value;
    const category = document.getElementById('category-input').value.trim();

    if (newTodo !== '') {
      const todos = JSON.parse(localStorage.getItem('todos')) || [];
      todos.push({
        text: newTodo,
        dueDate,
        priority,
        category,
        completed: false,
      });
      localStorage.setItem('todos', JSON.stringify(todos));
      renderTodos(todos);
      document.getElementById('todo-input').value = ''; // Clear input after adding todo
      document.getElementById('due-date').value = ''; // Clear date input
      document.getElementById('priority-select').selectedIndex = 0; // Reset priority select
      document.getElementById('category-input').value = ''; // Clear category input
    }
  });

  function checkDueDates() {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const today = new Date().toISOString().split('T')[0];

    todos.forEach((todo) => {
      if (todo.dueDate === today) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png', // Add your icon path
          title: 'Todo Reminder',
          message: `Reminder: ${todo.text} is due today!`,
        });
      }
    });
  }

  // Call this function on DOMContentLoaded
  checkDueDates();

  document.getElementById('toggle-theme').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
  });

  document.getElementById('export-todos').addEventListener('click', () => {
    const todos = JSON.parse(localStorage.getItem('todos')) || [];
    const blob = new Blob([JSON.stringify(todos)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todos.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document
    .getElementById('import-todos')
    .addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const todos = JSON.parse(e.target.result);
          localStorage.setItem('todos', JSON.stringify(todos));
          renderTodos(todos);
        };
        reader.readAsText(file);
      }
    });

  document.getElementById('todo-header').addEventListener('click', () => {
    const todoContent = document.getElementById('todo-content');
    todoContent.style.display =
      todoContent.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('chat-header').addEventListener('click', () => {
    const chatContent = document.getElementById('chat-content');
    chatContent.style.display =
      chatContent.style.display === 'none' ? 'block' : 'none';
  });
});

async function fetchRepoData(username, repoName) {
  const apiUrl = `https://api.github.com/repos/${username}/${repoName}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`GitHub API returned status ${response.status}`);
  }
  return response.json();
}

async function fetchRepoSize(username, repoName) {
  const apiUrl = `https://api.codetabs.com/v1/loc?github=${username}/${repoName}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Codetabs API returned status ${response.status}`);
  }
  return response.json();
}

// Chat functionality
document.getElementById('send-button').addEventListener('click', () => {
  const userInput = document.getElementById('user-input').value.trim();
  if (userInput) {
    addMessage(userInput, 'user');
    document.getElementById('user-input').value = ''; // Clear input

    // Send user message to the API
    sendMessageToAPI(userInput);
  }
});

function sendMessageToAPI(message) {
  fetch('https://proxy.tune.app/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: '',
    },
    body: JSON.stringify({
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
      model: 'kaushikaakash04/tune-blob',
      stream: false,
      frequency_penalty: 0,
      max_tokens: 900,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const assistantResponse = data.choices[0].message.content;
      addMessage(assistantResponse, 'assistant');
    })
    .catch((error) => {
      addMessage(`Error: ${error.message}`, 'assistant');
    });
}

function addMessage(text, sender) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}`;
  messageElement.textContent = text;
  document.getElementById('messages').appendChild(messageElement);
  scrollToBottom();
}

function scrollToBottom() {
  const messagesContainer = document.getElementById('messages');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

document.getElementById('toggle-links').addEventListener('click', () => {
  const linksContainer = document.getElementById('links-container');
  linksContainer.style.display =
    linksContainer.style.display === 'none' ? 'block' : 'none';
});

function displayCurrentTime() {
  const timeContainer = document.getElementById('current-time');
  if (!timeContainer) return; // Ensure the container exists

  // Initialize the timer display
  timeContainer.innerText = `Elapsed Time: 0:0:0`;
}
