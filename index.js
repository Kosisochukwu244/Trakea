let myLeads = []
let deletedLeads = [] // 
let currentFilter = 'all' // Track current category filter
let editingIndex = -1 //Track which lead is being edited

const inputBtn = document.getElementById("input-btn")
const inputEl = document.getElementById("input-el")
const ulEl = document.querySelector("#ul-el")
const deleteBtn = document.querySelector("#delete-btn")
const tabBtn = document.querySelector("#tab-btn")

// search input
const searchInput = document.getElementById("search-input")

// category elements
const categorySelect = document.getElementById("category-select")
const filterBtns = document.querySelectorAll(".filter-btn")

//  Export button
const exportBtn = document.getElementById("export-btn")

//  Edit modal elements
const editModal = document.getElementById("edit-modal")
const editTitle = document.getElementById("edit-title")
const editUrl = document.getElementById("edit-url")
const editNotes = document.getElementById("edit-notes")
const editCategory = document.getElementById("edit-category")
const saveEditBtn = document.getElementById("save-edit-btn")
const cancelEditBtn = document.getElementById("cancel-edit-btn")

const undoNotification = document.getElementById("undo-notification")
const undoBtn = document.getElementById("undo-btn")

const themeToggle = document.getElementById("theme-toggle")

// syncs across devices
chrome.storage.sync.get(["myLeads"], function(result) {
    if (result.myLeads) {
        myLeads = result.myLeads
        render(myLeads)
    }
})

// check for saved theme preference
chrome.storage.sync.get(["darkMode"], function(result) {
    if (result.darkMode) {
        document.body.classList.add("dark-mode")
        themeToggle.textContent = "☀️"
    }
})

//  dark mode toggle
themeToggle.addEventListener("click", function() {
    document.body.classList.toggle("dark-mode")
    const isDark = document.body.classList.contains("dark-mode")
    themeToggle.textContent = isDark ? "☀️" : "🌙"
    chrome.storage.sync.set({ darkMode: isDark })
})

// search functionality
searchInput.addEventListener("input", function() {
    render(myLeads)
})

// category filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener("click", function() {
        filterBtns.forEach(b => b.classList.remove("active"))
        this.classList.add("active")
        currentFilter = this.dataset.category
        render(myLeads)
    })
})

tabBtn.addEventListener("click", function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const url = tabs[0].url
        
        //  Duplicate detection
        const duplicate = myLeads.find(lead => lead.url === url)
        if (duplicate) {
            alert("hey, URL is already saved!")
            return
        }
        
        // Save with title, timestamp, and category
        const newLead = {
            url: url,
            title: tabs[0].title || url, // 
            timestamp: new Date().toISOString(),
            category: categorySelect.value || "",
            notes: "",
            visits: 0 
        }
        
        myLeads.push(newLead)
        saveLeads()
        render(myLeads)
    })
})

function render(leads) {
    let listItems = ""
    
    // Apply search filter
    const searchTerm = searchInput.value.toLowerCase()
    let filteredLeads = leads.filter(lead => {
        const matchesSearch = lead.title.toLowerCase().includes(searchTerm) || 
                            lead.url.toLowerCase().includes(searchTerm) ||
                            (lead.notes && lead.notes.toLowerCase().includes(searchTerm))
        
        // Apply category filter
        const matchesCategory = currentFilter === 'all' || lead.category === currentFilter
        
        return matchesSearch && matchesCategory
    })
    
    for (let i = 0; i < filteredLeads.length; i++) {
        const lead = filteredLeads[i]
        const originalIndex = myLeads.indexOf(lead)
        
        // Display timestamp
        const date = new Date(lead.timestamp)
        const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        
        // Display category badge
        const categoryBadge = lead.category ? `<span class="category-badge ${lead.category}">${lead.category}</span>` : ''
        
        // Display visit count
        const visitCount = lead.visits > 0 ? `<span class="visit-count">👁️ ${lead.visits}</span>` : ''
        
        listItems += `
            <li>
                <div class="lead-item">
                    <div class="lead-content">
                        <a target='_blank' href='${lead.url}' data-index="${originalIndex}">
                            <strong>${lead.title}</strong>
                        </a>
                        ${categoryBadge}
                        ${visitCount}
                        <div class="lead-meta">
                            <span class="timestamp">📅 ${formattedDate}</span>
                        </div>
                        ${lead.notes ? `<div class="lead-notes">📝 ${lead.notes}</div>` : ''}
                    </div>
                    <div class="lead-actions">
                        <button class="edit-btn" data-index="${originalIndex}">✏️</button>
                        <button class="delete-single-btn" data-index="${originalIndex}">🗑️</button>
                    </div>
                </div>
            </li>
        `
    }
    
    ulEl.innerHTML = filteredLeads.length > 0 ? listItems : '<li class="empty-message">No leads found</li>'
    
    // Add edit button listeners
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const index = parseInt(this.dataset.index)
            openEditModal(index)
        })
    })
    
    // Add delete single lead listeners
    document.querySelectorAll(".delete-single-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const index = parseInt(this.dataset.index)
            if (confirm("Delete this lead?")) {
                myLeads.splice(index, 1)
                saveLeads()
                render(myLeads)
            }
        })
    })
    
    //  Track visits when clicking links
    document.querySelectorAll("a[data-index]").forEach(link => {
        link.addEventListener("click", function() {
            const index = parseInt(this.dataset.index)
            myLeads[index].visits = (myLeads[index].visits || 0) + 1
            saveLeads()
        })
    })
}

// Edit modal functions
function openEditModal(index) {
    editingIndex = index
    const lead = myLeads[index]
    
    editTitle.value = lead.title
    editUrl.value = lead.url
    editNotes.value = lead.notes || ""
    editCategory.value = lead.category || ""
    
    editModal.classList.remove("hidden")
}

function closeEditModal() {
    editModal.classList.add("hidden")
    editingIndex = -1
}

saveEditBtn.addEventListener("click", function() {
    if (editingIndex >= 0) {
        myLeads[editingIndex].title = editTitle.value
        myLeads[editingIndex].url = editUrl.value
        myLeads[editingIndex].notes = editNotes.value
        myLeads[editingIndex].category = editCategory.value
        
        saveLeads()
        render(myLeads)
        closeEditModal()
    }
})

cancelEditBtn.addEventListener("click", closeEditModal)

// Delete all with undo
deleteBtn.addEventListener("dblclick", function() {
    deletedLeads = [...myLeads] // Store copy for undo
    myLeads = []
    saveLeads()
    render(myLeads)
    
    // Show undo notification
    undoNotification.classList.remove("hidden")
    setTimeout(() => {
        undoNotification.classList.add("hidden")
    }, 5000) 
})

// Undo delete
undoBtn.addEventListener("click", function() {
    myLeads = [...deletedLeads]
    saveLeads()
    render(myLeads)
    undoNotification.classList.add("hidden")
})

inputBtn.addEventListener("click", function() {
    const url = inputEl.value
    
    if (!url) {
        alert("Please enter a URL")
        return
    }
    
    // Duplicate detection
    const duplicate = myLeads.find(lead => lead.url === url)
    if (duplicate) {
        alert("This URL is already saved!")
        return
    }
    
    // Save with title, timestamp, and category
    const newLead = {
        url: url,
        title: url, // Can be edited later
        timestamp: new Date().toISOString(),
        category: categorySelect.value || "",
        notes: "",
        visits: 0
    }
    
    myLeads.push(newLead)
    inputEl.value = ""
    categorySelect.value = ""
    
    saveLeads()
    render(myLeads)
})

// Export data as JSON
exportBtn.addEventListener("click", function() {
    const dataStr = JSON.stringify(myLeads, null, 2)
    const dataBlob = new Blob([dataStr], {type: 'application/json'})
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'leads-export-' + new Date().toISOString().split('T')[0] + '.json'
    link.click()
    URL.revokeObjectURL(url)
})

// Save to chrome.storage.sync (syncs across devices)
function saveLeads() {
    chrome.storage.sync.set({ myLeads: myLeads })
}

// if possible, use const. if not, use let