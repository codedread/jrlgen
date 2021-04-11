const searchbox = document.querySelector('#searchbox');
const fullListDiv = document.querySelector('#fullList');
const readingListDiv = document.querySelector('#readingList');
const clearButton = document.querySelector('#clearButton');
const addAllButton = document.querySelector('#addAllButton');
const doneButton = document.querySelector('#doneButton');

const READING_ROOT = '/data/';
const DB_FILE = 'all-files.txt';
let allFiles = [];
const currentList = [];
let filteredList = [];

function addBookToList(book) {
  currentList.push(book);
}

/**
 * Assuming all comic books are in the READING_ROOT directory of the web server, create
 * the "database" by:
 *   $ cd ~/reading
 *   $ find . | grep "\.cb" | grep -v "BROKEN" | cut -c3- | sort > all-files.txt
 */
function createAllFilesAsync() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', (READING_ROOT + DB_FILE), true);
    xhr.responseType = 'text';
    xhr.onload = (evt) => {
      const allFilesString = evt.target.response;
      resolve(allFilesString
          .split(/\r?\n/)  // Split by EOL.
          .slice(0, -1)    // Remove last empty line.
          .sort()
          .map(f => READING_ROOT + f));
    };
    xhr.onerror = (err) => {
      reject(err);
    }
    xhr.send(null);
  });
}

function onAddAll() {
  filteredList.forEach(addBookToList);
  renderCurrentReadingList();
  searchbox.focus();
}

function onClear() {
  currentList.splice(0, currentList.length);
  renderCurrentReadingList();
  searchbox.focus();
}

function onDone() {
  const prettyJson = JSON.stringify(JSON.parse(readingListDiv.dataset.json), null, '  ');
  const outwin = window.open('', 'output');
  const outdoc = outwin.document;
  outdoc.open();
  outdoc.write('<pre>');
  outdoc.write(prettyJson);
  outdoc.close();
  searchbox.focus();
}

function focusSearchBox() {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  searchbox.focus();
  window.scrollTo(scrollX, scrollY);
}

function onFullListClick(evt) {
  addBookToList(evt.target.textContent);
  renderCurrentReadingList();
  focusSearchBox();
}

function onReadingListClick(evt) {
  const bookDiv = evt.target;
  const index = parseInt(bookDiv.dataset.index, 10);
  currentList.splice(index, 1);
  renderCurrentReadingList();
  focusSearchBox();
}

function onKeyUp(evt) {
  // ESC clears the search box.
  if (evt.keyCode === 27) {
    searchbox.value = '';
  }
  populateFullList(searchbox.value);
}

/**
 * @param {string} fullPath
 * @returns {string}
 */
function extractFilename(fullPath) {
  const lastSlash = fullPath.lastIndexOf('/');
  return fullPath.substring(lastSlash + 1);
}

/**
 * @param {string} path1
 * @param {string} path2
 * @returns {string}
 */
function extractCommonPrefix(path1, path2) {
  let commonPrefix = '';
  for (let i = 0; i < path1.length; ++i) {
    if (i > path2.length) break;
    if (path2.charAt(i) === path1.charAt(i)) {
      commonPrefix += path2.charAt(i);
    } else {
      break;
    }
  }
  return commonPrefix;
}

/**
 * @param {string} query
 */
function populateFullList(query = '') {
  fullListDiv.innerHTML = '';
  filteredList = [];
  const fileDivs = [];
  const queryTerms = query.split(' ').map(s => s.toLowerCase());
  let prevFilename;
  let even = false;
  for (const file of allFiles) {
    let matched = true;
    let matchedIndex = 0;
    for (const queryTerm of queryTerms) {
      matchedIndex = file.substring(matchedIndex).toLowerCase().indexOf(queryTerm);
      if (matchedIndex == -1) {
        matched = false;
        break;
      }
    }
    if (!matched) {
      continue;
    }

    const thisFilename = extractFilename(file);
    if (prevFilename) {
      const prefix = extractCommonPrefix(prevFilename, thisFilename);
      if (prefix.length < 6) {
        even = !even;
      }
    }
    prevFilename = thisFilename;

    filteredList.push(file);
    const fileDiv = document.createElement('div');
    fileDiv.classList.add('file', even ? 'even' : 'odd');
    fileDiv.innerHTML = `<span>${file}</span>`;
    fileDivs.push(fileDiv);
  }
  fullListDiv.append(...fileDivs);
}

function renderCurrentReadingList() {
  const json = {items:[]};
  for (const item of currentList) {
    json.items.push({uri: item, type: 'book'});
  }

  readingListDiv.innerHTML = '<div>{items:[</div>';
  readingListDiv.dataset.json = JSON.stringify(json);
  const fileDivs = [];
  for (let i = 0; i < currentList.length; ++i) {
    const item = currentList[i];
    const fileDiv = document.createElement('div');
    fileDiv.className = 'file';
    if (i < currentList.length - 1) {
      fileDiv.innerHTML = `<span data-index="${i}">{"type": "book", "uri":"${item}"},</span>`;
    } else {
      fileDiv.innerHTML = `<span data-index="${i}">{"type": "book", "uri":"${item}"}</span>`;
    }
    fileDivs.push(fileDiv);
  }
  readingListDiv.append(...fileDivs);
  const endDiv = document.createElement('div');
  endDiv.innerHTML = `<div>]}</div>`;
  readingListDiv.append(endDiv);
}

function init() {
  createAllFilesAsync().then(fileList => {
    allFiles = fileList;
    searchbox.focus();
    searchbox.addEventListener('keyup', onKeyUp);
    fullListDiv.addEventListener('click', onFullListClick);
    readingListDiv.addEventListener('click', onReadingListClick);
    clearButton.addEventListener('click', onClear);
    addAllButton.addEventListener('click', onAddAll);
    doneButton.addEventListener('click', onDone);
  
    populateFullList();
  }).catch(err => alert(err));
}

init();