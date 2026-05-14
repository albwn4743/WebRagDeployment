from Dataset import connect_weaviate, get_embeddings, search_query
import warnings
from Ai_Services import process_query
import asyncio
from urllib.parse import urlparse
from scraping import crawl_website
from upload_docs import process_and_upload_documents
warnings.filterwarnings("ignore")
print("Initializing Retrieval System...")
client = connect_weaviate()

# Check if collection exists and has data
collection_name = "WebDocument"
has_data = False
if client.collections.exists(collection_name):
    collection = client.collections.get(collection_name)
    if len(collection) > 0:
        has_data = True

if not has_data:
    print("\n[!] No documents found in the database.")
    while True:
        url = input("Enter Website URL to scrape and upload (or type 'quit' to exit): ")
        
        if url.lower().strip() in ['quit', 'exit', 'q']:
            print("Exiting.")
            client.close()
            exit()
            
        if not url.strip():
            print("Please enter a valid URL.")
            continue
            
        print(f"Starting scraping for {url.strip()}...")
        scraped_results = asyncio.run(crawl_website(url.strip()))
        print(f"\nScraping complete. Total pages scraped: {len(scraped_results)}")
        
        if scraped_results:
            domain = urlparse(url.strip()).netloc
            print("Starting upload to Weaviate...")
            process_and_upload_documents(scraped_results, domain)
            print("\nUpload complete! You can now start querying.")
            break # Exit loop and continue to querying
        else:
            print("\n[!] No documents were scraped. The website might be blocking access.")
            print("Please try another URL.\n")

embeddings = get_embeddings()

print("Retrieval System Ready!\n")
print("Type 'quit' or 'exit' to stop.")

while True:
    query = input("\n👤 You: ")

    if query.lower() in ["quit", "exit", "q"]:
        print("Goodbye!")
        break

    if not query.strip():
        continue

    # Search in Weaviate
    results = search_query(query, client, embeddings)

    print("\n🔍 Retrieved Results:\n")

    if not results:
        print("No relevant documents found.")
    else:
        for i, result in enumerate(results, start=1):

            # Adjust these keys based on your returned data structure
            text = result.get("text", "No text found")
            source = result.get("source", "Unknown Source")
            score = result.get("score", "N/A")

            print(f"Result {i}")
            print(f"Source : {source}")
            print(f"Score  : {score}")
            print(f"Text   :\n{text}")
            print("-" * 60)
            
        print("\nAI Response:\n")
        answer = process_query(query, results)
        print(answer)
client.close()