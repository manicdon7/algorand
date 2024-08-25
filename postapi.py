from fastapi import FastAPI, HTTPException, Request
from pyteal import compileTeal, Mode, Approve, Txn, App, Bytes, Int, Seq, Cond, OnComplete, If, Return, Reject
import algosdk
import os

app = FastAPI()

# Endpoint to compile and deploy the smart contract
@app.post("/api/smart-contract/deploy")
async def deploy_smart_contract(request: Request):
    try:
        data = await request.json()
        code = data.get("code", None)

        if not code:
            raise HTTPException(status_code=400, detail="No code provided")

        # Inject necessary globals for the PyTeal code execution
        exec_globals = {
            "__builtins__": None,  # Restrict builtins for safety
            "compileTeal": compileTeal,
            "Mode": Mode,
            "Approve": Approve,
            "Txn": Txn,
            "App": App,
            "Bytes": Bytes,
            "Int": Int,
            "Seq": Seq,
            "Cond": Cond,
            "OnComplete": OnComplete,
            "If": If,
            "Return": Return,
            "Reject": Reject
        }
        exec_locals = {}

        try:
            # Execute the provided PyTeal code
            exec(code, exec_globals, exec_locals)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error executing PyTeal code: {str(e)}")

        # Check if the TEAL file was created
        teal_file = "program.teal"
        if not os.path.exists(teal_file):
            raise HTTPException(status_code=500, detail="TEAL file not generated. Ensure the PyTeal code is correct.")

        with open(teal_file, "r") as f:
            teal_code = f.read()

        # Compile the TEAL code using the Algorand SDK
        algod_client = algosdk.v2client.algod.AlgodClient("", "https://testnet-api.algonode.cloud", headers={"X-Algo-API-Token": "YOUR_API_TOKEN_HERE"})

        compiled_response = algod_client.compile(teal_code)
        compiled_teal = compiled_response['result']

        # Deploy the smart contract
        sender_address = "YOUR_ALGOD_ADDRESS"
        sender_private_key = "YOUR_ALGOD_PRIVATE_KEY"

        # Set up the transaction
        txn = algosdk.future.transaction.ApplicationCreateTxn(
            sender=sender_address,
            sp=algod_client.suggested_params(),
            on_complete=algosdk.future.transaction.OnComplete.NoOpOC.real,
            approval_program=compiled_teal,
            clear_program=compiled_teal,  # Assuming you use the same for simplicity
            global_schema=algosdk.future.transaction.StateSchema(1, 1),
            local_schema=algosdk.future.transaction.StateSchema(0, 0),
        )

        signed_txn = txn.sign(sender_private_key)
        tx_id = algod_client.send_transaction(signed_txn)
        confirmation = algosdk.transaction.wait_for_confirmation(algod_client, tx_id, 4)

        return {"appId": confirmation['application-index']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists("program.teal"):
            os.remove("program.teal")


# Endpoint to interact with the smart contract (store and read value)
@app.post("/api/smart-contract/interact")
async def interact_smart_contract(request: Request):
    try:
        data = await request.json()
        app_id = data.get("appId")
        action = data.get("action")
        value = data.get("value", None)

        if not app_id or not action:
            raise HTTPException(status_code=400, detail="App ID or action missing")

        algod_client = algosdk.v2client.algod.AlgodClient("", "https://graphql.bitquery.io", headers={"X-API-KEY": "BQYprhw0lsQDm1T1nKKi6izOwlettE7C"})

        sender_address = "IAWM3GIMRUVPPPMJ7RLPPXK5PXZ34Q5XEZ7KJKIEUSZPC3QBCFIZTD72HA"
        sender_private_key = "frown scatter young voyage token smooth own mango category lounge improve phrase metal mystery glide zone leisure valve hurt bus end educate together ability enough"

        if action == "store":
            if not value:
                raise HTTPException(status_code=400, detail="Value to store is missing")

            # Store the value
            txn = algosdk.future.transaction.ApplicationNoOpTxn(
                sender=sender_address,
                sp=algod_client.suggested_params(),
                index=app_id,
                app_args=[value]
            )

            signed_txn = txn.sign(sender_private_key)
            tx_id = algod_client.send_transaction(signed_txn)
            algosdk.transaction.wait_for_confirmation(algod_client, tx_id, 4)

            return {"message": "Value stored successfully"}

        elif action == "read":
            # Read the stored value
            app_info = algod_client.application_info(app_id)
            stored_value = app_info['params']['global-state'][0]['value']['bytes']

            return {"stored_value": stored_value}

        else:
            raise HTTPException(status_code=400, detail="Invalid action")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)
