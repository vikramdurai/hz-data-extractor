alert("Data extractor has loaded and is now active")

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

var candidates = [];

async function getDataFromCandidatePage() {
    async function gD(x) {
        return (await waitForElm(x)).innerText.trim()
    }
    // Get profile data
    let profileData = {
        // None of these work consistently
        project: (await gD(".pagination-header__header-text")).slice(5),
        // job: await gD(".position-item__position-title-link"),
        // company: await gD(".position-item__company-link"),
        // location: (await waitForElm("#test-row-lockup-location")).innerText.trim(),
        // name: await gD(".artdeco-entity-lockup__title")
    }

    // Go the the Messages tab
    document.querySelectorAll('.navigation-list__item')[2].click();
    // Click on message-threads
    (await waitForElm(".message-threads-list__list-item--link")).click();
    await waitForElm(".message-list-entity__date")
    let inMailDates = document.querySelectorAll(".message-list-entity__date");
    return candidates[candidates.push({...profileData, ...{
        status: document.querySelector(".message-state-entity__text").innerText.trim(),
        contacted: inMailDates[0].innerText.trim(),
        responded: inMailDates[1].innerText.trim(),
        name: document.querySelectorAll(".message-list-entity__sender-name")[1].innerText.trim()
    }}) - 1]
}

document.addEventListener("keydown", e => {
    e.stopImmediatePropagation();
    if (e.code == "KeyH") {
        getDataFromCandidatePage().then(v => {
            alert(`Saved candidate ${v.name} in project ${v.project}`);
        })
    }
})

chrome.runtime.onMessage.addListener((m, s, reply) => {
    switch(m.type) {
        case "getCandidates":
            reply(candidates.length);
            break;
        case "getCSV":
            reply(saveCandidatesAsCSV());
            break;
    }
});

function saveCandidatesAsCSV() {
    let csvText = "Name,Status,Contacted,Responded,Project\n";
    candidates.forEach(c => {
        csvText += `"${c.name}","${c.status}","${c.contacted}","${c.responded}","${c.project}"\n`;
    })
    return csvText
}

function getCandidatesFromPage() {
    let names = document.querySelectorAll(".artdeco-entity-lockup__title");
    let profileLinks = [];
    for (x of names) { profileLinks.push(x.children[0].href) }
    let candidates = [];
    for (let i = 0; i < 25; i++) {
        candidates.push({ name: names[i].innerText, href: profileLinks[i] })
    }
    return candidates;
}