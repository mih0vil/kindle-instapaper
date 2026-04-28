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
* User should be able to navigate back using an arrow button on the top of the page

