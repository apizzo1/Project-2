import sqlalchemy
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, func

from flask import Flask, jsonify, render_template
# create engine
engine = create_engine('postgresql://postgres:Khaleesi3!@localhost:5432/hindsight_2020')
# reflect DB
Base=automap_base()
Base.prepare(engine, reflect = True)

# Flask init
app = Flask(__name__)

# dict_builder
def dict_creation(response, headers):
    response_list=[]
    for item in response:
        item_dict={}
        for i in range(0,len(headers)):
            num1=headers[i]
            item_dict[num1]=item[i]
        response_list.append(item_dict)
    return(response_list)

# home route
@app.route("/")
def welcome():
    return render_template("index.html")

@app.route("/api/v1.0/headlines")
def headlines():
    # Create our session (link) from Python to the DB

    results = engine.execute('SELECT date, img_url, headline, article_url FROM headlines').fetchall()
    # dict keys
    headers_list=['date', 'img_url', 'headline', 'article_url']

    db_response=dict_creation(results,headers_list)
    return jsonify(db_response)

@app.route("/api/v1.0/national_mobility")
def national_mobility():
    # Create our session (link) from Python to the DB

    results = engine.execute('SELECT * FROM national_mobility').fetchall()
    # dict keys
    headers_list=['year', 'month', 'day', 'retail', 'grocery', 'parks', 'transit', 'work', 'residential', 'away_from_home']

    db_response=dict_creation(results,headers_list)
    return jsonify(db_response)

@app.route("/api/v1.0/state_mobility")
def state_mobility():
    # Create our session (link) from Python to the DB

    results = engine.execute('select sm.id, si.state_abbrev, sm.year, sm.month, sm.day, sm.gps_retail_and_recreation, sm.gps_grocery_and_pharmacy, sm.gps_parks, sm.gps_transit_stations, sm.gps_workplaces, sm.gps_residential, sm.gps_away_from_home from state_mobility as sm inner join state_ids as si on sm.id=si.id').fetchall()
    # dict keys
    headers_list=['id', 'state_abbrev', 'year', 'month', 'day', 'retail', 'grocery', 'parks', 'transit', 'work', 'residential', 'away_from_home']

    db_response=dict_creation(results,headers_list)
    return jsonify(db_response)

# @app.route("/api/v1.0/national_ui")
# def state_mobility():
#     # Create our session (link) from Python to the DB

#     results = engine.execute('select sm.id, si.state_abbrev, sm.year, sm.month, sm.day, sm.gps_retail_and_recreation, sm.gps_grocery_and_pharmacy, sm.gps_parks, sm.gps_transit_stations, sm.gps_workplaces, sm.gps_residential, sm.gps_away_from_home from state_mobility as sm inner join state_ids as si on sm.id=si.id').fetchall()
#     # dict keys
#     headers_list=['id', 'state_abbrev', 'year', 'month', 'day', 'retail', 'grocery', 'parks', 'transit', 'work', 'residential', 'away_from_home']

#     db_response=dict_creation(results,headers_list)
#     return jsonify(db_response)
if __name__ == '__main__':
    app.run(debug=True)
