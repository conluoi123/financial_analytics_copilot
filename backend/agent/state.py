# Định nghĩa bộ nhớ cho Chat 

import operator 
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage 

class AgentState(TypedDict): 
    # dùng để tin nhắn mới ko bị ghi đè
    messages: Annotated[Sequence[BaseMessage], operator.add]