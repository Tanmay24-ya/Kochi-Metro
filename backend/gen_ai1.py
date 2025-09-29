from pinecone import Pinecone
import os
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv
from langchain.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.output_parsers import StrOutputParser
from langchain.schema import Document
from pinecone import ServerlessSpec

load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Validate API keys
if not PINECONE_API_KEY:
    raise ValueError("❌ PINECONE_API_KEY not found in environment variables")
if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not found in environment variables")

os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

pc = Pinecone(api_key=PINECONE_API_KEY)

index_name = "doc-embeddings"
if not pc.has_index(index_name):
    pc.delete_index(index_name)
    pc.create_index(
        name=index_name,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

index = pc.Index(index_name)

encoder = HuggingFaceEmbeddings(
    model_name=r"C:\Users\bahra\.cache\huggingface\hub\models--sentence-transformers--paraphrase-multilingual-MiniLM-L12-v2\snapshots\86741b4e3f5cb7765a600d3a3d55a0f6a6cb443d",
    model_kwargs={"device": "cpu"}
)



def encode(pdf_id, page_numb, docs, encoder=encoder):
    """Embed and store document chunks"""
    if not docs:
        print("⚠️  No documents to encode")
        return

    try:
        embeddings = encoder.embed_documents(docs)
        vectors = [
            (str(f"{pdf_id}_{page_numb}_{i}"), emb, {
                "pdf_id": str(pdf_id),
                "chunk_index": i,
                "page_no": page_numb,
                "text": docs[i]
            })
            for i, emb in enumerate(embeddings)
        ]
        index.upsert(vectors,namespace=str(pdf_id))
        print(f"✅ {len(vectors)} chunks stored in Pinecone for {pdf_id} page {page_numb}")
    except Exception as e:
        print(f"❌ Error encoding documents: {e}")

query = (
    "Key organizational operations, critical urgent tasks and deadlines, compliance and regulatory updates, "
    "inter-departmental coordination issues, staffing and HR priorities, safety bulletins, procurement status, "
    "knowledge retention challenges, and strategic initiatives impacting timely decision-making and operational efficiency."
    "financial performance, budgets, payments, audits, cost control, funding, procurement finance"
    "പ്രധാന സംഘടനാ പ്രവർത്തനങ്ങൾ, അടിയന്തരമായ നിർണായക ജോലികളും അവസാന തീയതികളും, അനുസരണവും നിയന്ത്രണാത്മകമായ പുതുക്കലുകളും, അന്തർ-വകുപ്പ് ഏകോപന പ്രശ്നങ്ങൾ, സ്റ്റാഫിംഗ്‌യും മാനവ വിഭവശേഷി മുൻഗണനകളും, സുരക്ഷാ ബുള്ളറ്റിനുകൾ, വാങ്ങൽ നില, അറിവ് സംരക്ഷണ വെല്ലുവിളികൾ, സമയബന്ധിതമായ തീരുമാനം കൈക്കൊള്ളലിനെയും പ്രവർത്തന കാര്യക്ഷമതയെയും ബാധിക്കുന്ന തന്ത്രപരമായ പ്രവർത്തനങ്ങൾ."
    "സാമ്പത്തിക പ്രകടനം, ബജറ്റുകൾ, പേയ്‌മെന്റുകൾ, ഓഡിറ്റുകൾ, ചെലവ് നിയന്ത്രണം, ഫണ്ടിംഗ്, വാങ്ങൽ ധനകാര്യം."
)

def query_pinecone_top_k(pdf_id, top_k=10, query=query):
    """Query Pinecone for relevant chunks"""
    print(f"\n🔍 Querying Pinecone for pdf_id: {pdf_id}")

    try:
        q_emb = encoder.embed_query(query)
        results = index.query(
            vector=q_emb,
            top_k=top_k,
            include_metadata=True,
            namespace=str(pdf_id)
        )

        docs = [
            Document(
                page_content=match['metadata'].get('text', ''),
                metadata=match['metadata']
            )
            for match in results.get('matches', [])
            if match['metadata'].get('text', '').strip()  # Filter out empty texts
        ]

        if not docs:
            print("⚠️  No relevant chunks found with semantic search, fetching all chunks...")
            all_results = index.query(
                vector=[0.0] * 384,
                top_k=top_k,
                include_metadata=True,
                namespace=str(pdf_id)
            )
            docs = [
                Document(
                    page_content=match["metadata"].get("text", ""),
                    metadata=match["metadata"]
                )
                for match in all_results.get("matches", [])
                if match["metadata"].get("text", "").strip()
            ]

        print(f"✅ Retrieved {len(docs)} chunks from Pinecone")

        # Debug: Print first chunk preview
        if docs:
            print(f"📄 First chunk preview: {docs[0].page_content[:200]}...")
        else:
            print("❌ No chunks found for this PDF!")

        return docs

    except Exception as e:
        print(f"❌ Error querying Pinecone: {e}")
        return []

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert organizational analyst. Generate a brief, actionable summary that highlights the most important and urgent points "
        "from the given document chunks. The summary should focus on tasks department heads need to act on immediately, critical deadlines, compliance, "
        "and cross-department coordination issues. Use only the provided context strictly.\n\n"
        "If the text is in english print summary in english else print in hybrid language malayalam and english\n"
        "Structure:\n"
        "1. Overview of Main Operations and Activities\n"
        "2. Critical Urgent Tasks and Immediate Deadlines\n"
        "3. Compliance and Regulatory Highlights\n"
        "4. Key Departmental Responsibilities and Coordination Needs\n"
        "5. Safety, Staffing, Procurement, and Strategic Initiatives\n"
    ),
    ("user", "Summarize the following document accordingly:\n\n{context}")
])

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash-exp",
    temperature=0,
    max_tokens=1000,
    timeout=60,  # Add timeout
)

output_parser = StrOutputParser()
chain = create_stuff_documents_chain(llm, prompt=prompt, output_parser=output_parser)


def create_summary(pdf_id):
    """Generate summary from retrieved chunks"""
    print(f"\n📝 Generating summary for {pdf_id}...")

    try:
        # Step 1: Retrieve chunks
        docs = query_pinecone_top_k(pdf_id)

        if not docs:
            error_msg = f"❌ No documents found in Pinecone for pdf_id: {pdf_id}"
            print(error_msg)
            return error_msg

        # Step 2: Generate summary
        print(f"🤖 Sending {len(docs)} chunks to Gemini API...")

        try:
            summary = chain.invoke({"context": docs})

            # Validate output
            if not summary or not summary.strip():
                print("⚠️  Gemini returned empty response, retrying with fewer chunks...")
                if len(docs) > 5:
                    docs = docs[:5]
                    summary = chain.invoke({"context": docs})

            if summary and summary.strip():
                print("✅ Summary generated successfully!")
                print(f"📊 Summary length: {len(summary)} characters")
                return summary
            else:
                error_msg = "❌ Gemini API returned empty summary"
                print(error_msg)
                return error_msg

        except Exception as api_error:
            print(f"❌ Gemini API error: {api_error}")

            # Retry with reduced context
            if len(docs) > 3:
                print("🔄 Retrying with top 3 chunks only...")
                try:
                    summary = chain.invoke({"context": docs[:3]})
                    if summary and summary.strip():
                        print("✅ Summary generated with reduced context")
                        return summary
                except Exception as retry_error:
                    print(f"❌ Retry also failed: {retry_error}")

            return f"Summary generation failed: {str(api_error)}"

    except Exception as e:
        error_msg = f"❌ Unexpected error in create_summary: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return error_msg