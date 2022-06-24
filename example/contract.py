#!/usr/bin/env python3
from pyteal import *
import os


def approval():
    payment = Gtxn[1]
    hello_world = Seq(App.globalPut(Bytes("Hello"), Bytes("World!")), Approve())
    save_txn = Seq(
        App.globalPut(Bytes("TX"), payment.tx_id()),
        App.globalPut(Bytes("Amount"), payment.amount()),
        Approve(),
    )
    return Cond(
        [Txn.application_id() == Int(0), hello_world],
        [payment.type_enum() == TxnType.Payment, save_txn],
    )


def clear():
    return Approve()


if __name__ == "__main__":
    if os.path.exists("approval.teal"):
        os.remove("approval.teal")

    if os.path.exists("clear.teal"):
        os.remove("clear.teal")

    compiled_approval = compileTeal(approval(), mode=Mode.Application, version=6)

    with open("approval.teal", "w") as f:
        f.write(compiled_approval)

    compiled_clear = compileTeal(clear(), mode=Mode.Application, version=6)

    with open("clear.teal", "w") as f:
        f.write(compiled_clear)
