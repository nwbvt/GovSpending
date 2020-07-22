#!/usr/bin/env python
from ast import literal_eval
from argparse import ArgumentParser
import json
import sys

CATS = ["Defense", "Education", "General Government", "Health Care", "Interest", "Other Spending", "Pensions", "Protection", "Transportation", "Welfare"]
COLS = ["Year", "GDP", "Population", "Federal", "Federal_i", "Transfer", "Transfer_i", "State", "State_i", "Local", "Local_i", "Total", "Total_i"]
DEFAULT_UNIT = "$ billion 2012"

def eval(s):
    try:
        return literal_eval(s)
    except:
        return None

def parse_line(line, cols):
    line = line.strip()
    if not line:
        return None
    return dict(zip(cols, map(eval, line.split(","))))


def get_spending(row):
    return {level: (float(row.get(level, 0)), row.get(f"{level}_i", 'n'))
            for level in ["Federal", "State", "Local", "Transfer"]}

def get_cols(col_row, cat, unit=DEFAULT_UNIT):
    colnames = list(map(literal_eval, col_row.split(',')))
    cols = [""] * len(colnames)
    cols[colnames.index('Year')] = 'Year'
    cols[colnames.index(f'GDP-US {unit}')] = "GDP"
    cols[colnames.index("Population-US million")] = "Population"
    for level in ["Federal", "Transfer", "State", "Local", "Total"]:
        expected_col = f"{cat} - {'' if level == 'Transfer' else level} {unit}"
        if expected_col in colnames:
            cols[colnames.index(expected_col)] = level
            cols[colnames.index(expected_col) + 1] = level + "_i"
    return cols


def build_data(folder):
    data = {}
    with open(f"{folder}/total.csv") as f:
        lines = f.readlines()
        cols = get_cols(lines[1], "Total Spending")
        for line in lines[2:]:
            row = parse_line(line, cols)
            if row is None:
                break
            year = int(row['Year'])
            data[year] = {
                'Population': row['Population'],
                'GDP': row['GDP'],
                'Total': get_spending(row)
            }

    for cat in CATS:
        file_cat = cat.lower().replace(" ", "")
        with open(f"{folder}/{file_cat}.csv") as f:
            lines = f.readlines()
            cols = get_cols(lines[1], cat)
            for line in lines[2:]:
                row = parse_line(line, cols)
                if row is None:
                    break
                year = int(row['Year'])
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
    