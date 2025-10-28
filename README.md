# Questions for Client

1. UMass Boston only?
2. Suggestions for technical implementation?
   - Is there a particular database that you prefer us to use?
3. Vision for user interface / experience?
   - Should the app be all on one page or have multiple?
4. Is there a preference for which LLM to use?
5. Acceptable / desirable to ask the user for their degree audit?
   - Is it okay to pass the degree audit to an LLM?
   - Should we expunge personal info before passing to LLM?

# Meeting 1 Notes

1. Want the output of the proposed course paths to be visual
   - D3
2. No preference on DBMS: proposed options
   - DynamoDB
   - AWS
   - MongoDB
3. We can use synthetic data for this project to not spend time scraping data
   - Allows for the creation of synthetic data instead of scraping
   - Would be good to be have the program be scalable beyond just UMB hence we create synthetic data for fake uni's for the time being
4. Ok to let people upload their transcripts making sure to expunge sensitive data before feeding LLM to use
