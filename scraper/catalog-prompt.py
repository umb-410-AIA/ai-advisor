from langchain_community.document_loaders import JSONLoader
import getpass
import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")