# User should be able to list articles from Instapaper

* Application displays articles from Instapaper in a list
    * there should be two lists:
        * unread
        * archive
* Each article should display title, url, description, and publication date
* Application fetches articles from Instapaper using Instapaper API. Check @instapaper_skills.md for more information
    * Secrets for Instapaper API should be stored in .env file
    * .env file should not be commited to version control

# Remember username and password for login

* Application should remember username and password for login
* Application should use cookies to store username and password
* User should stay logged in until he logs out

# Title of the application should be "Instapaper to Kindle"

* Application should display title "Instapaper to Kindle" in the header
* Application should display title "Instapaper to Kindle" in the login page
