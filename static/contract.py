#!/usr/bin/env python3
from pyteal import *
import os


def approval():
    return Approve()


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
