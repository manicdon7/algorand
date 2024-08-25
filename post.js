const axios = require('axios');

const postSmartContract = async () => {
  try {
    const smartContractCode = `
from pyteal import *


def approval_program_explicit_ensure():
    args = [
        Bytes("base64", "iZWMx72KvU6Bw6sPAWQFL96YH+VMrBA0XKWD9XbZOZI="),
        Bytes(
            "base64",
            "if8ooA+32YZc4SQBvIDDY8tgTatPoq4IZ8Kr+We1t38LR2RuURmaVu9D4shbi4VvND87PUqq5/0vsNFEGIIEDA==",
        ),
        Addr("7JOPVEP3ABJUW5YZ5WFIONLPWTZ5MYX5HFK4K7JLGSIAG7RRB42MNLQ224"),
    ]
    opup = OpUp(OpUpMode.Explicit, Int(1))
    return Seq(
        If(Txn.application_id() != Int(0)).Then(
            Seq(
                opup.ensure_budget(Int(2000)),
                Pop(Ed25519Verify(args[0], args[1], args[2])),
            )
        ),
        Approve(),
    )


def approval_program_oncall_ensure():
    args = [
        Bytes("base64", "iZWMx72KvU6Bw6sPAWQFL96YH+VMrBA0XKWD9XbZOZI="),
        Bytes(
            "base64",
            "if8ooA+32YZc4SQBvIDDY8tgTatPoq4IZ8Kr+We1t38LR2RuURmaVu9D4shbi4VvND87PUqq5/0vsNFEGIIEDA==",
        ),
        Addr("7JOPVEP3ABJUW5YZ5WFIONLPWTZ5MYX5HFK4K7JLGSIAG7RRB42MNLQ224"),
    ]
    opup = OpUp(OpUpMode.OnCall)
    return Seq(
        If(Txn.application_id() != Int(0)).Then(
            Seq(
                opup.ensure_budget(Int(2000)),
                Pop(Ed25519Verify(args[0], args[1], args[2])),
            )
        ),
        Approve(),
    )


def approval_program_explicit_maximize():
    args = [
        Bytes("base64", "iZWMx72KvU6Bw6sPAWQFL96YH+VMrBA0XKWD9XbZOZI="),
        Bytes(
            "base64",
            "if8ooA+32YZc4SQBvIDDY8tgTatPoq4IZ8Kr+We1t38LR2RuURmaVu9D4shbi4VvND87PUqq5/0vsNFEGIIEDA==",
        ),
        Addr("7JOPVEP3ABJUW5YZ5WFIONLPWTZ5MYX5HFK4K7JLGSIAG7RRB42MNLQ224"),
    ]
    opup = OpUp(OpUpMode.Explicit, Int(1))
    return Seq(
        If(Txn.application_id() != Int(0)).Then(
            Seq(
                opup.maximize_budget(Int(3000)),
                Pop(Ed25519Verify(args[0], args[1], args[2])),
            )
        ),
        Approve(),
    )


def approval_program_oncall_maximize():
    args = [
        Bytes("base64", "iZWMx72KvU6Bw6sPAWQFL96YH+VMrBA0XKWD9XbZOZI="),
        Bytes(
            "base64",
            "if8ooA+32YZc4SQBvIDDY8tgTatPoq4IZ8Kr+We1t38LR2RuURmaVu9D4shbi4VvND87PUqq5/0vsNFEGIIEDA==",
        ),
        Addr("7JOPVEP3ABJUW5YZ5WFIONLPWTZ5MYX5HFK4K7JLGSIAG7RRB42MNLQ224"),
    ]
    opup = OpUp(OpUpMode.OnCall)
    return Seq(
        If(Txn.application_id() != Int(0)).Then(
            Seq(
                opup.maximize_budget(Int(3000)),
                Pop(Ed25519Verify(args[0], args[1], args[2])),
            )
        ),
        Approve(),
    )


if __name__ == "__main__":
    with open("program.teal", "w") as f:
        compiled = compileTeal(
            approval_program_oncall_maximize(), mode=Mode.Application, version=6
        )
        f.write(compiled)
`;

    const response = await axios.post('http://localhost:5000/api/smart-contract', {
      code: smartContractCode, // Ensures the 'code' key is correctly set
    });

    console.log('Smart contract processed:', response.data);
  } catch (error) {
    console.error('Error sending smart contract:', error.response?.data || error.message);
  }
};

postSmartContract();