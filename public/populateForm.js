document.getElementById('infoForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevents the default form submission
    const webpageUrl = document.getElementById('webpageUrl').value;

    // Send the URL to the server
    const response = await fetch('/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: webpageUrl })
    });

    if (response.ok) {
        const data = await response.json();

        // Populate the form fields with the data from the server
        document.getElementById('companyName').value = data.extractedInfo.companyName;
        document.getElementById('typeOfProduct').value = data.extractedInfo.typeOfProduct;
        document.getElementById('idealUser').value = data.extractedInfo.idealUser;

        // Display the generated content
        const contentContainer = document.getElementById('generatedContent');
        contentContainer.innerHTML = `<h3>Generated Content:</h3><p>${data.generatedContent}</p>`;
    } else {
        console.error('Failed to fetch data');
    }
});



   