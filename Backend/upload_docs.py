import os
import warnings
warnings.filterwarnings("ignore")
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from Dataset import get_embeddings
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.config import Configure, Property, DataType
from dotenv import load_dotenv
load_dotenv()
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, separators=["\n\n", "\n", " ", ""])

def process_and_upload_documents(documents, domain):
    """
    Process a list of documents, chunk them, generate embeddings, and upload to Weaviate.
    
    :param documents: list of dicts containing 'content', 'url', 'title'
    :param domain: str, the domain of the website
    """
    # Initialize Weaviate client inside the function for safe connection handling
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=os.getenv("WEAVIATE_CLUSTER_URL"),
        auth_credentials=Auth.api_key(os.getenv("WEAVIATE_API_KEY")),
        skip_init_checks=True
    )
    
    try:
        collection_name = "WebDocument"
        
        # Ensure collection exists
        if not client.collections.exists(collection_name):
            client.collections.create(
                name=collection_name,
                properties=[
                    Property(name="content", data_type=DataType.TEXT),
                    Property(name="url", data_type=DataType.TEXT),
                    Property(name="title", data_type=DataType.TEXT),
                    Property(name="chunk_id", data_type=DataType.INT),
                    Property(name="domain", data_type=DataType.TEXT),
                ]
            )
            
        collection = client.collections.get(collection_name)
        
        chunk_documents = []
        for doc in documents:
            clean_text = doc.get('content', '')
            if not clean_text:
                continue
                
            current_url = doc.get('url', '')
            title = doc.get('title', 'Untitled')
            
            # Split text into chunks
            chunks = splitter.split_text(clean_text)

            for i, chunk in enumerate(chunks):
                chunk_doc = {
                    'content': chunk,
                    'metadata': {
                        "url": current_url,
                        "title": f"{title} - Chunk {i+1}",
                        'chunk_id': i,
                        'domain': domain
                    }   
                }
                chunk_documents.append(chunk_doc)
                
        if not chunk_documents:
            print("No valid chunks created from the documents.")
            return
            
        print(f"Total chunks to process: {len(chunk_documents)}")
            
        # Generate embeddings for all chunks at once
        # Prepend context so the embedding model knows what the text is about
        text_chunks = [
            f"Domain: {c['metadata']['domain']} | Title: {c['metadata']['title']}\n\n{c['content']}" 
            for c in chunk_documents
        ]
        print("Generating embeddings...")
        embeddings = get_embeddings()
        vectors = embeddings.embed_documents(text_chunks)
        
        # Batch upload
        print("Uploading to Weaviate...")
        with collection.batch.dynamic() as batch:
            for i, doc in enumerate(chunk_documents):
                batch.add_object(
                    properties={
                        "content": doc['content'],
                        "url": doc['metadata']['url'],
                        "title": doc['metadata']['title'],
                        "chunk_id": doc['metadata']['chunk_id'],
                        "domain": doc['metadata']['domain'],
                    },
                    vector=vectors[i]
                )
                
        print(f"Successfully uploaded {len(chunk_documents)} chunks to Weaviate.")
        
    finally:
        # Always close the client connection
        client.close()

if __name__ == "__main__":
    import asyncio
    from urllib.parse import urlparse
    from scraping import crawl_website
    
    url = input("Enter Website URL to scrape and upload: ")
    
    # 1. Scrape the website
    print(f"Starting scraping for {url}...")
    results = asyncio.run(crawl_website(url))
    print(f"\nScraping complete. Total pages scraped: {len(results)}")
    
    if results:
        # 2. Extract domain
        domain = urlparse(url).netloc
        
        # 3. Process and Upload
        print("Starting upload to Weaviate...")
        process_and_upload_documents(results, domain)
    else:
        print("No documents were scraped. Exiting.")