# Chạy giao diện

from langchain_core.messages import HumanMessage
from backend.agent.graph import app

def chat():
    print("="*50)
    print("🤖 Chào mừng đến với FinSight Copilot")
    print("="*50)
    
    while True:
        user_input = input("\nBạn: ")
        if user_input.lower() in ['exit', 'quit']: break
            
        print("[AI đang suy nghĩ...]")
        inputs = {"messages": [HumanMessage(content=user_input)]}
        
        # Chạy Graph
        for event in app.stream(inputs, stream_mode="values"):
            message = event["messages"][-1]
            if message.type == "ai" and not message.tool_calls:
                print(f"\n🤖 FinSight:\n{message.content}")
                
if __name__ == "__main__":
    chat()
