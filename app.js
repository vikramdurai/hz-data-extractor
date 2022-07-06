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

function isVisible(elem) {
    if (!(elem instanceof Element)) throw Error('DomUtil: elem is not an element.');
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity < 0.1) return false;
    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false;
    }
    const elemCenter   = {
        x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
        y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
    };
    if (elemCenter.x < 0) return false;
    if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
    if (elemCenter.y < 0) return false;
    if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
    let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
    do {
        if (pointContainer === elem) return true;
    } while (pointContainer = pointContainer.parentNode);
    return false;
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

    
    let messagesTab = document.querySelectorAll('.navigation-list__item')[2];
    let cName = [...document.querySelectorAll('[data-live-test-row-lockup-full-name]')].filter(isVisible)[0].innerText.trim();
    let currentDatetime = new Date().toLocaleString();
    let contacted = "-";
    let responded = "-";
    let status = "Uncontacted";

    if (Number(messagesTab.innerText[10]) >= 1) {
        messagesTab.click();
        status = (await gD(".message-state-entity__text"));
        // Click on message-threads
        (await waitForElm(".message-threads-list__list-item--link")).click();
        await waitForElm(".message-list-entity__date")
        let inMailDates = document.querySelectorAll(".message-list-entity__date");
        contacted = inMailDates[0].innerText.trim();
        responded = (status == "Accepted")? inMailDates[1].innerText.trim() : "-";
    }
    return candidates[candidates.push({...profileData, ...{
        status: status,
        contacted: contacted,
        responded: responded,
        name: cName,
        dateAccessed: currentDatetime,
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
    let csvText = "Name,Status,Contacted,Responded,Project,Date Accessed\n";
    candidates.forEach(c => {
        csvText += `"${c.name}","${c.status}","${c.contacted}","${c.responded}","${c.project}","${c.dateAccessed}"\n`;
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