// Mobile Navigation

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", function () {
    navMenu.classList.toggle("active");
});


// Close Mobile Menu After Clicking Link

document.querySelectorAll(".nav-menu a").forEach(function(link) {

    link.addEventListener("click", function() {
        navMenu.classList.remove("active");
    });

});


// Search Tools

function searchTools() {

    const input = document
        .getElementById("searchInput")
        .value
        .trim()
        .toLowerCase();

    if (!input) {
        alert("Please enter a tool name.");
        return;
    }

    const toolCards = document.querySelectorAll(".tool-card");

    let found = false;

    toolCards.forEach(function(card) {

        const name = card.querySelector("h3")
            .innerText.toLowerCase();

        const description = card.querySelector("p")
            .innerText.toLowerCase();

        if (name.includes(input) || description.includes(input)) {

            if (!card.classList.contains("coming-soon")) {
                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                card.style.outline = "2px solid #4f46e5";

                setTimeout(function() {
                    card.style.outline = "";
                }, 2000);

                found = true;
            }

        }

    });

    if (!found) {
        alert("Tool not found or coming soon!");
    }

}


// Enter Key Search

document.getElementById("searchInput")
    .addEventListener("keypress", function(event) {

        if (event.key === "Enter") {
            searchTools();
        }

    });