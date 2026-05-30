# Lắp ráp bộ não và thần kinh 
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage

from backend.agent.state import AgentState
from backend.agent.tools import query_duckdb_tool, check_anomaly_tool

load_dotenv()

tools = [query_duckdb_tool, check_anomaly_tool]

# Đổi từ ChatOpenAI -> ChatGoogleGenerativeAI
llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",   # Phiên bản 3.1 Flash Lite
    temperature=0
)
llm_with_tools = llm.bind_tools(tools)

def call_model(state: AgentState):
    messages = state["messages"]
    if len(messages) > 0 and not isinstance(messages[0], SystemMessage):
        sys_msg = SystemMessage(
            content="Bạn là FinSight Copilot, trợ lý tài chính thông minh. Bạn có thể viết SQL để lấy dữ liệu DuckDB hoặc dùng công cụ kiểm tra bất thường để soi kỹ mã cổ phiếu."
        )
        messages = [sys_msg] + list(messages)

    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "__end__"

workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))
workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", "__end__": END})
workflow.add_edge("tools", "agent")

app = workflow.compile()