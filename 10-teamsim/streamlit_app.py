import streamlit as st
import numpy as np
import pandas as pd
import io
import plotly.graph_objects as go # Added for CFD
import random # Added for choices, uncertainty

# --- Simulation Design (Section 6) ---

# 6.1 Entities & State (Enhanced)
class Feature:
    _counter = 0
    def __init__(self, creation_day, complexity_mu=1.0, complexity_sigma=0.1, value_mu=10, value_sigma=2):
        Feature._counter += 1
        self.id = Feature._counter
        self.state = "Backlog" # Backlog -> Design -> Build -> Test -> Done
        self.value = max(0, np.random.normal(value_mu, value_sigma))
        self.complexity = max(0.1, np.random.normal(complexity_mu, complexity_sigma)) # Ensure complexity > 0
        self.creation_day = creation_day
        self.design_start_day = -1
        self.build_start_day = -1
        self.test_start_day = -1
        self.done_day = -1
        self.rework_count = 0
        # Track work remaining for each stage
        self.design_work_remaining = 0
        self.build_work_remaining = 0
        self.test_work_remaining = 0
        self.is_rework = False # Flag to track if current Build state is due to rework

    def get_lead_time(self):
        if self.done_day >= self.creation_day:
            return self.done_day - self.creation_day + 1 # Inclusive of start and end day
        return -1 # Not finished yet

class Pod:
    def __init__(self, name, wip_limit, params, upstream_queue, downstream_queue=None, rework_queue=None):
        self.name = name
        self.wip_limit = wip_limit
        self.params = params # Access to global sim params
        self.upstream_queue = upstream_queue
        self.downstream_queue = downstream_queue
        self.rework_queue = rework_queue # Specific queue for rework (usually Build Pod's queue)
        self.wip = [] # Features currently being worked on
        self.daily_capacity_hours = 8 # Assuming 8 hours/day
        self.total_work_done_today = 0 # Track capacity usage
        self.total_idle_days = 0 # Counter for idle days


    def _calculate_task_time(self, feature):
        # Calculate base time using N(mu, sigma) per PRD 6.3
        mu_key = f"mu_{self.name.lower()}"
        sigma_key = "sigma_task"
        mu = self.params.get(mu_key, 1.0)
        sigma = self.params.get(sigma_key, 0.1)

        # Adjust test time sigma based on test coverage (PRD 6.3)
        if self.name == "Test":
            test_coverage_factor = (1 - self.params.get("test_coverage", 0) / 100.0)
            sigma *= test_coverage_factor # Higher coverage = lower variability

        base_time = max(0.1, np.random.normal(mu, sigma)) # Ensure minimum time
        task_time = base_time * feature.complexity # Scale by feature complexity
        return task_time # In days

    def pull_work(self, current_day):
        """Pull work from upstream queue if WIP limit allows."""
        while len(self.wip) < self.wip_limit and self.upstream_queue:
            feature = self.upstream_queue.pop(0) # FIFO
            feature.state = self.name # Update feature state
            # Assign work remaining when item enters pod
            work_needed = self._calculate_task_time(feature)
            if self.name == "Design":
                feature.design_start_day = current_day
                feature.design_work_remaining = work_needed
            elif self.name == "Build":
                feature.build_start_day = current_day
                feature.build_work_remaining = work_needed
            elif self.name == "Test":
                feature.test_start_day = current_day
                feature.test_work_remaining = work_needed
            self.wip.append(feature)

    def process_work(self, current_day):
        """Process features in WIP, consuming daily capacity."""
        self.total_work_done_today = 0
        available_capacity = self.daily_capacity_hours / 8 # Convert capacity to "days" of work
        work_items = list(self.wip) # Iterate over a copy
        random.shuffle(work_items) # Process in random order to avoid bias

        if not work_items:
             self.total_idle_days += 1

        for feature in work_items:
            if available_capacity <= 0:
                break # No more capacity today

            work_to_do = 0
            if self.name == "Design": work_to_do = feature.design_work_remaining
            elif self.name == "Build": work_to_do = feature.build_work_remaining
            elif self.name == "Test": work_to_do = feature.test_work_remaining

            work_done_on_feature = min(available_capacity, work_to_do)
            self.total_work_done_today += work_done_on_feature
            available_capacity -= work_done_on_feature

            if self.name == "Design": feature.design_work_remaining -= work_done_on_feature
            elif self.name == "Build": feature.build_work_remaining -= work_done_on_feature
            elif self.name == "Test": feature.test_work_remaining -= work_done_on_feature

            # Check for completion
            if work_to_do - work_done_on_feature <= 1e-6: # Use tolerance for float comparison
                 self._push_feature(feature, current_day)


    def _push_feature(self, feature, current_day):
        """Move completed feature downstream or handle rework."""
        self.wip.remove(feature)

        if self.name == "Test":
            # Check for rework based on uncertainty (PRD 6.3)
            if random.random() < self.params.get("feature_uncertainty", 0):
                feature.rework_count += 1
                feature.state = "Build" # Send back to Build
                feature.is_rework = True
                # Reset Build work - assume rework takes similar effort
                feature.build_work_remaining = self._calculate_task_time(feature) # Recalculate time needed for build
                self.rework_queue.append(feature) # Use the dedicated rework queue (Build Pod's queue)
            else:
                # Feature passed testing
                feature.state = "Done"
                feature.done_day = current_day
                feature.is_rework = False
                if self.downstream_queue is not None: # Should be the 'done_features' list
                     self.downstream_queue.append(feature)
        elif self.downstream_queue is not None:
            # Move to the next pod's queue
            feature.is_rework = False # Reset rework flag when moving forward
            self.downstream_queue.append(feature)
        else:
            # Should not happen if 'Done' list is configured as downstream for Test pod
            print(f"Warning: Feature {feature.id} completed in {self.name} but no downstream queue configured.")


# 6.2 Parameters (updated internal defaults)
DEFAULT_PARAMS = {
    "batch_size": 5,
    "wip_design": 4,
    "wip_build": 4,
    "wip_test": 4,
    "feedback_latency": 3, # Note: Feedback Latency L is not directly used in this simple kernel yet
    "test_coverage": 40,
    "feature_uncertainty": 0.3,
    "sim_length": 20,
    # Internal params
    "mu_design": 1.0, # Avg days for design task (complexity 1.0)
    "mu_build": 2.0,  # Avg days for build task
    "mu_test": 1.5,   # Avg days for test task
    "sigma_task": 0.3, # Variability (std dev) in days for tasks
    "complexity_mu": 1.0, # Avg feature complexity
    "complexity_sigma": 0.2, # Variability in complexity
    "value_mu": 10, # Avg feature value
    "value_sigma": 3   # Variability in value
}

# --- Simulation Kernel (Implemented) ---
def run_simulation(params):
    Feature._counter = 0 # Reset feature ID counter for each run
    np.random.seed(42) # Make runs repeatable for the same parameters
    random.seed(42)

    # --- Initialization ---
    sim_length = params['sim_length']
    backlog = []
    design_queue = []
    build_queue = []
    test_queue = []
    done_features = [] # List to collect completed features

    # Create Pods (linked queues)
    test_pod = Pod("Test", params['wip_test'], params, test_queue, downstream_queue=done_features, rework_queue=build_queue)
    build_pod = Pod("Build", params['wip_build'], params, build_queue, downstream_queue=test_queue)
    design_pod = Pod("Design", params['wip_design'], params, design_queue, downstream_queue=build_queue)

    pods = [design_pod, build_pod, test_pod]

    # Metrics & Logging Setup
    history = [] # For detailed run log
    cfd_data = { "Day": [], "Backlog": [], "Design": [], "Build": [], "Test": [], "Done": [] }

    # --- Simulation Loop ---
    for day in range(sim_length):
        # 1. Generate New Features (Batch Arrival at Day 0 for simplicity)
        if day == 0:
            for i in range(params['batch_size'] * (sim_length // 5)): # Generate features upfront based on average throughput idea
                 complexity = max(0.1, np.random.normal(params["complexity_mu"], params["complexity_sigma"]))
                 value = max(0, np.random.normal(params["value_mu"], params["value_sigma"]))
                 feature = Feature(day, complexity_mu=complexity, value_mu=value)
                 backlog.append(feature)
            design_queue.extend(backlog) # Move all generated features to Design queue initially
            backlog = []


        # 2. Pod Processing (Pull -> Work -> Push)
        # Process in reverse order (Test -> Build -> Design) to facilitate pulling
        for pod in reversed(pods):
            pod.pull_work(day) # Pull first fills up WIP
        for pod in pods:
            pod.process_work(day) # Then process based on available capacity

        # 3. Record Daily State for CFD & History
        cfd_data["Day"].append(day)
        cfd_data["Backlog"].append(len(backlog)) # Should be 0 after day 0 in this model
        cfd_data["Design"].append(len(design_queue) + sum(1 for f in design_pod.wip if f.state == "Design"))
        cfd_data["Build"].append(len(build_queue) + sum(1 for f in build_pod.wip if f.state == "Build"))
        cfd_data["Test"].append(len(test_queue) + sum(1 for f in test_pod.wip if f.state == "Test"))
        cfd_data["Done"].append(len(done_features))

        # Capture feature state changes for detailed log (optional, can be heavy)
        # for feature in design_pod.wip + build_pod.wip + test_pod.wip + done_features:
        #     history.append({"Day": day, "FeatureID": feature.id, "State": feature.state, ... })

    # --- Post-Simulation Analysis & Metrics Calculation ---
    completed_features = [f for f in done_features if f.done_day != -1]

    # Run Log DataFrame
    log_data = []
    all_features = design_queue + build_queue + test_queue + design_pod.wip + build_pod.wip + test_pod.wip + done_features
    for f in all_features:
         log_data.append({
             "Feature ID": f.id,
             "Value": round(f.value, 2),
             "Complexity": round(f.complexity, 2),
             "Creation Day": f.creation_day,
             "Design Start": f.design_start_day,
             "Build Start": f.build_start_day,
             "Test Start": f.test_start_day,
             "Done Day": f.done_day,
             "Lead Time": f.get_lead_time(),
             "Rework Count": f.rework_count,
             "Final State": f.state
         })
    run_log_df = pd.DataFrame(log_data)
    run_log_df.sort_values(by="Feature ID", inplace=True)


    # Metrics Calculation (PRD 6.4)
    metrics = {}
    if completed_features:
        lead_times = run_log_df[run_log_df['Lead Time'] != -1]['Lead Time']
        metrics["avg_lead_time"] = lead_times.mean() if not lead_times.empty else 0
        # Calculate lead time per iteration (approximation: average lead time of features finished *by* that iteration)
        lead_time_hist = run_log_df[run_log_df['Done Day'] != -1].groupby('Done Day')['Lead Time'].mean()
        lead_time_df = pd.DataFrame(lead_time_hist).reindex(range(sim_length), fill_value=None).ffill().reset_index()
        lead_time_df.columns = ['Iteration', 'Lead Time (days)']
        metrics["lead_time_per_feature"] = lead_time_df.set_index('Iteration')

        # Throughput per iteration
        throughput_hist = run_log_df[run_log_df['Done Day'] != -1].groupby('Done Day').size()
        throughput_df = pd.DataFrame(throughput_hist).reindex(range(sim_length), fill_value=0).reset_index()
        throughput_df.columns = ['Iteration', 'Throughput']
        metrics["throughput_per_iter"] = throughput_df.set_index('Iteration')
        metrics["avg_throughput"] = throughput_hist.mean() if not throughput_hist.empty else 0

        metrics["total_value"] = run_log_df[run_log_df['Done Day'] != -1]['Value'].sum()
        metrics["rework_rate"] = run_log_df['Rework Count'].sum() / len(run_log_df) if not run_log_df.empty else 0

    else:
        metrics["avg_lead_time"] = 0
        metrics["lead_time_per_feature"] = pd.DataFrame({'Iteration': range(sim_length), 'Lead Time (days)': 0}).set_index('Iteration')
        metrics["avg_throughput"] = 0
        metrics["throughput_per_iter"] = pd.DataFrame({'Iteration': range(sim_length), 'Throughput': 0}).set_index('Iteration')
        metrics["total_value"] = 0
        metrics["rework_rate"] = 0

    # Idle Time % per pod
    metrics["idle_time_design"] = design_pod.total_idle_days / sim_length if sim_length > 0 else 0
    metrics["idle_time_build"] = build_pod.total_idle_days / sim_length if sim_length > 0 else 0
    metrics["idle_time_test"] = test_pod.total_idle_days / sim_length if sim_length > 0 else 0

    # LLM Cost (Placeholder)
    metrics["llm_cost"] = 0.00 # Reset dummy cost, will be calculated by actual LLM call

    # CFD Dataframe
    cfd_df = pd.DataFrame(cfd_data).set_index('Day')

    # Placeholder Narrative
    narrative = f"Simulation Complete ({sim_length} days). {len(completed_features)} features finished. Average Lead Time: {metrics['avg_lead_time']:.2f} days. Rework Rate: {metrics['rework_rate']:.1%}."
    if metrics['rework_rate'] > params['feature_uncertainty'] * 0.8: # Example simple insight
        narrative += " High rework rate observed, potentially due to high feature uncertainty or insufficient testing."
    if metrics["idle_time_test"] > 0.5:
        narrative += " Test pod seems underutilized."

    st.snow() # Fun indicator

    return metrics, run_log_df, cfd_df, narrative # Added cfd_df

# --- UI Layout (Section 7) ---
st.set_page_config(layout="wide")
st.title("🌊 FlowLab Simulator") # Added emoji

# Initialize session state for results (add cfd)
if 'last_metrics' not in st.session_state:
    st.session_state['last_metrics'] = None
if 'last_run_log' not in st.session_state:
    st.session_state['last_run_log'] = None
if 'last_narrative' not in st.session_state:
    st.session_state['last_narrative'] = None
if 'current_metrics' not in st.session_state:
    st.session_state['current_metrics'] = None
if 'current_run_log' not in st.session_state:
    st.session_state['current_run_log'] = None
if 'current_narrative' not in st.session_state:
    st.session_state['current_narrative'] = None
if 'current_cfd' not in st.session_state: # Added for CFD
    st.session_state['current_cfd'] = None


# 7.1 Sidebar Controls
with st.sidebar:
    st.header("🛠️ Simulation Parameters") # Added emoji

    # Using session state to store param values
    for key, default_val in DEFAULT_PARAMS.items():
        if key not in st.session_state:
            st.session_state[key] = default_val

    # Sliders and Selects based on PRD 6.2
    st.session_state.batch_size = st.slider("Batch Size (B)", 1, 20, st.session_state.batch_size, help="Number of features entering the system together.")
    # Separate WIP limits for now, might consolidate later
    st.session_state.wip_design = st.slider("WIP Limit (Design)", 1, 10, st.session_state.wip_design)
    st.session_state.wip_build = st.slider("WIP Limit (Build)", 1, 10, st.session_state.wip_build)
    st.session_state.wip_test = st.slider("WIP Limit (Test)", 1, 10, st.session_state.wip_test)

    st.session_state.feedback_latency = st.slider("Feedback Latency (L, days)", 0, 15, st.session_state.feedback_latency, help="Delay before value/bugs are known after 'Done'. (Currently informational)") # Updated help
    st.session_state.test_coverage = st.slider("Automated Test Coverage % (T)", 0, 90, st.session_state.test_coverage, step=10, help="Reduces test time variability (lower sigma).") # Updated help
    st.session_state.feature_uncertainty = st.slider("Feature Uncertainty p(rework)", 0.0, 0.8, st.session_state.feature_uncertainty, step=0.05, help="Probability a feature needs rework after testing.")
    st.session_state.sim_length = st.slider("Simulation Length (iterations/days)", 5, 50, st.session_state.sim_length)

    # Run Button
    run_button_clicked = st.button("Run Simulation", type="primary")

    # Scenario Presets (Placeholder)
    st.selectbox("Scenario Presets", ["Default", "High WIP", "Poor Quality"], disabled=True)

    # Compare Runs (Placeholder)
    compare_runs = st.checkbox("Compare with previous run", disabled=not st.session_state['last_metrics'])


# --- Main Column ---
# Removed explicit columns here, let Streamlit manage flow within tabs

# Tabbed Interface
tab_metrics, tab_flow, tab_narrator, tab_log = st.tabs(["📊 Metrics", "🌊 Flow Diagram", "🤖 Narrator", "📄 Run Log"])

if run_button_clicked:
    # Store previous results if they exist
    if st.session_state['current_metrics']:
        st.session_state['last_metrics'] = st.session_state['current_metrics']
        st.session_state['last_run_log'] = st.session_state['current_run_log']
        st.session_state['last_narrative'] = st.session_state['current_narrative']
        st.session_state['last_cfd'] = st.session_state['current_cfd'] # Store last CFD

    # Collect current parameters
    current_params = {key: st.session_state[key] for key in DEFAULT_PARAMS} # Use state keys

    # Execute Simulation
    with st.spinner("Running simulation kernel..."):
        metrics, run_log_df, cfd_df, narrative = run_simulation(current_params) # Capture cfd_df
        st.session_state['current_metrics'] = metrics
        st.session_state['current_run_log'] = run_log_df
        st.session_state['current_narrative'] = narrative
        st.session_state['current_cfd'] = cfd_df # Store current CFD
        # Removed success message, snow effect indicates completion

# --- Display Results ---
metrics_data = st.session_state['current_metrics']
narrative_text = st.session_state['current_narrative']
run_log_data = st.session_state['current_run_log']
cfd_data = st.session_state['current_cfd'] # Get CFD data

if metrics_data:
    with tab_metrics:
        st.header("📈 Key Performance Indicators")

        # Top-level KPI Snapshot Table (PRD 7.1) - Use calculated metrics
        kpi_summary = {
            "Metric": ["Avg Lead Time", "Avg Throughput (/day)", "Rework Rate", "Total Value Delivered", "LLM Cost"],
            "Value": [
                f"{metrics_data.get('avg_lead_time', 0):.2f} days",
                f"{metrics_data.get('avg_throughput', 0):.2f}",
                f"{metrics_data.get('rework_rate', 0):.1%}",
                f"{metrics_data.get('total_value', 0):.0f}",
                f"${metrics_data.get('llm_cost', 0):.4f}" # Get from metrics dict
            ]
        }
        st.table(pd.DataFrame(kpi_summary))

        col1, col2 = st.columns(2)
        with col1:
            # Line chart – lead‑time vs. iteration (PRD 7.1)
            st.subheader("Average Lead Time Trend")
            if not metrics_data['lead_time_per_feature'].empty:
                 st.line_chart(metrics_data['lead_time_per_feature'], y="Lead Time (days)")
            else:
                 st.caption("No features completed.")

        with col2:
            # Bar chart – throughput (PRD 7.1)
            st.subheader("Throughput per Day")
            if not metrics_data['throughput_per_iter'].empty:
                st.bar_chart(metrics_data['throughput_per_iter'], y="Throughput")
            else:
                 st.caption("No features completed.")

        # Idle time
        st.subheader("Pod Idle Time")
        idle_data = {
            'Pod': ['Design', 'Build', 'Test'],
            'Idle Time (%)': [
                metrics_data.get('idle_time_design', 0) * 100,
                metrics_data.get('idle_time_build', 0) * 100,
                metrics_data.get('idle_time_test', 0) * 100
            ]
        }
        st.bar_chart(pd.DataFrame(idle_data).set_index('Pod'))


    with tab_flow:
        st.header("🌊 Cumulative Flow Diagram (CFD)")
        if cfd_data is not None and not cfd_data.empty:
             # Use Plotly for stacked area chart
             fig = go.Figure()
             colors = {'Backlog': '#D3D3D3', 'Design': '#ADD8E6', 'Build': '#FFD700', 'Test': '#FFA07A', 'Done': '#90EE90'}
             states_in_order = ['Backlog', 'Design', 'Build', 'Test', 'Done'] # Define plot order

             for state in states_in_order:
                 if state in cfd_data.columns:
                     fig.add_trace(go.Scatter(
                         x=cfd_data.index, y=cfd_data[state],
                         hoverinfo='x+y',
                         mode='lines',
                         line=dict(width=0.5, color=colors.get(state, '#808080')),
                         stackgroup='one', # Creates the stacked area effect
                         name=state
                     ))

             fig.update_layout(
                 title="Feature Flow Over Time",
                 xaxis_title="Simulation Day",
                 yaxis_title="Number of Features",
                 hovermode="x unified",
                 legend_title_text='State'
             )
             st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("Run simulation to generate CFD data.", icon="📊")

    with tab_narrator:
        st.header("🤖 Simulation Narrative")
        if narrative_text:
            st.markdown(narrative_text)
            # Placeholder for "Ask Why" input (PRD 7.1)
            st.text_input("Ask Narrator why...", disabled=True, key="narrator_ask")
            st.caption(f"Narrator cost for this run: ${metrics_data.get('llm_cost', 0):.4f}") # Get from metrics
        else:
            st.info("Run the simulation to generate a narrative.")


    with tab_log:
        st.header("📄 Run Log Data")
        if run_log_data is not None and not run_log_data.empty:
            st.dataframe(run_log_data)
            # Download CSV button (PRD 5.3)
            csv = run_log_data.to_csv(index=False).encode('utf-8')
            st.download_button(
                 label="Download Run Log as CSV",
                 data=csv,
                 file_name='flowlab_run_log.csv',
                 mime='text/csv',
             )
        else:
            st.info("Run the simulation to generate log data.")

else:
    st.info("Adjust parameters in the sidebar and click 'Run Simulation'.")

# Footer Badge (PRD 7.2)
st.sidebar.markdown("---")
llm_cost_display = f"${st.session_state['current_metrics'].get('llm_cost', 0):.4f}" if st.session_state['current_metrics'] else "N/A"
st.sidebar.caption(f"FlowLab v0.2 | LLM Cost: {llm_cost_display}") # Increment version, update cost display
# TODO: Implement LLM integration, "Compare Runs" logic


# --- Main Execution Logic ---
# (No separate main needed for simple Streamlit apps)
# if __name__ == "__main__":
#    pass # Streamlit runs the script from top to bottom 