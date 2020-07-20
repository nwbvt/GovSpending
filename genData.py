#!/usr/bin/env python
from ast import literal_eval
from argparse import ArgumentParser
import json
import sys

CATS = ["defense", "education", "general", "healthcare", "interest", "other", "pensions", "protection", "transportation", "welfare"]
COLS = ["year", "gdp", "population", "fed", "fed_i", "state", "state_i", "local", "local_i"]

def eval(s):
    try:
        return literal_eval(s)
    except:
        return None

def parse_line(line):
    line = line.strip()
    if not line:
        return None
    return dict(zip(COLS, map(eval, line.split(","))))


def get_spending(row):
    return {level: (float(row[level]), row[f"{level}_i"])
            for level in ["fed", "state", "local"]}


def build_data(folder):
    data = {}
    with open(f"{folder}/total.csv") as f:
        lines = f.readlines()
        for line in lines[2:]:
            row = parse_line(line)
            if row is None:
                break
            year = int(row['year'])
            data[year] = {
                'population': row['population'],
                'gdp': row['gdp'],
                'total': get_spending(row)
            }

    for cat in CATS:
        with open(f"{folder}/{cat}.csv") as f:
            lines = f.readlines()
            for line in lines[2:]:
                row = parse_line(line)
                if row is None:
                    break
                year = int(row['year'])
                data[year][cat] = get_spending(row)
    return data

def run():
    parser = ArgumentParser()
    parser.add_argument("source", default="data", nargs="?", help="folder containing data")
    args = parser.parse_args()
    results = build_data(args.source)
    json.dump(results, sys.stdout)


if __name__ == "__main__":
    run()
    