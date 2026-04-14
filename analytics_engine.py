import dash
from dash import Input, dcc, html, Output
import plotly.express as px
import pandas as pd
from sqlalchemy import create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lyntraAdmin:lyntra-2026@localhost:5432/lyntra_analytics")
engine = create_engine(DATABASE_URL)

app =dash.Dash(__name__)

app.layout = html.Div([
    dcc.Interval(id="interval-component", interval=5*1000, n_intervals=0),
    html.Div(id="live-update-graph")
])

@app.callback(Output("live-update-graph", "children"), Input("interval-component", "n_intervals"))
def update_graph_live(n):
    query = "SELECT week_label, wau_rate_pct, activation_rate_pct FROM lyntra_analytics.v_dashboard_summary WHERE course_name = 'Total Pilot' ORDER BY week_id ASC"
    df = pd.read_sql_query(query, engine)

    fig = px.line(df, x="week_label", y=["wau_rate_pct", "activation_rate_pct"], markers=True, title="WAU Rate and Activation Rate Over Time")

    fig.update_traces(line_color="blue", name="WAU Rate (%)", selector=dict(name="wau_rate_pct"), marker=dict(color="#171147", size=10))

    return dcc.Graph(figure=fig, config={"displayModeBar": False})

if __name__ == "__main__":
    app.run(debug=True, port=8050)
    print("Analytics Engine is running on http://localhost:8050")