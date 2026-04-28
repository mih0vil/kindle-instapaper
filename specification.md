# User should be able to list articles from Instapaper

* Application displays articles from Instapaper in a list
    * there should be two lists:
        * unread
        * archive
* Each article should display title, url, description, and publication date
* Application fetches articles from Instapaper using Instapaper API. Check @instapaper_skills.md for more information
    * Secrets for Instapaper API should be stored in .env file
    * .env file should not be commited to version control

# User stays logged in

* Application should not save username and password because this is a security issue
* User should stay logged in until he logs out manually

# Title of the application should be "Instapaper to Kindle"

* Application should display title "Instapaper to Kindle" in the header
* Application should display title "Instapaper to Kindle" in the login page

# Viewing an article

* When user clicks on an article, it should navigate to the article page
* The article page should display:
    * title
    * url
    * description
    * publication date
    * article content
* User should be able to navigate back using an arrow button on the top of the page. When navigating back, app should show previous page user was remembering if it was list of unread or archive articles
* User should be able to send an article to Kindle using "Send to Kindle" button
* User should be able to archive an unread article.
    * This action should remove the article from the unread list and add it to the archive list
* User should be able to unarchive an archived article.

# Archive old articles

* On the main page above the list of article, there should be a button "Archive old articles" and input field for date
* When user clicks on "Archive old articles" button, application should archive all articles older than the date in the input field
* The input date should be pre-filled with today's date minus 3 months
* There should be a date picker for selecting the date and user should be able to enter the date manually.
* User should be able to select a date and then click "Archive old articles" button to archive articles older than the selected date.
* When user clicks on "Archive old articles" button, application should show a modal with the progress bar displaying total number of articles to be archived and number of articles archived so far.

# Sending bulk of new articles to Kindle

* There should be a button "Send new articles to Kindle" on the main page.
* When user clicks on "Send new articles to Kindle" button, application should send 20 unread articles to Kindle.
* This action should be a POST route named /api/send-bulk-to-kindle and should return the date of the newest article
* The title of the email should be "Instapaper yyyy-mm-dd" where yyyy-mm-dd is the date of newest article
* All articles should be combined into one email and sent as a single HTML file. 
* Each article should be represented with:
    * Title in <h1> tag
    * Article content below title. The content should be transformed in a way that all <h1..6> tags are converted to <h2..6> tags, e.g. <h2> becomes <h3>, etc.
* Articles in the email should be separated with a horizontal line.
* All of this articles which are sent to Kindle should be archived. In the implementation, archive the articles after the email is sucessfully sent to Kindle.
