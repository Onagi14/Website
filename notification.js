// script.js

document.getElementById('notificationForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the default form submission

    const notificationMessage = document.getElementById('notificationMessage').value;

    try {
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: notificationMessage }),
        });

        if (response.ok) {
            alert('Notification sent successfully!');
            document.getElementById('notificationMessage').value = ''; // Clear the message
        } else {
            const errorData = await response.json();
            alert(errorData.error); // Show error message
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        alert("An error occurred while sending the notification.");
    }
});
