"""Flask-WTF forms (server-side validation + CSRF)."""
from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, FloatField, SubmitField
from wtforms.validators import DataRequired, Length, NumberRange, Optional

TRANSPORT_MODES = ["Road", "Rail", "Sea", "Air"]
SHIPMENT_STATUSES = ["In-transit", "Delayed", "On-hold", "Delivered"]


class ShipmentForm(FlaskForm):
    tracking_no = StringField("Tracking No.", validators=[Optional(), Length(max=30)],
                              description="Leave blank to auto-generate (CS-xxxx).")
    origin = SelectField("Origin city", validators=[DataRequired()])
    destination = SelectField("Destination city", validators=[DataRequired()])
    transport_mode = SelectField("Transport mode", choices=TRANSPORT_MODES, validators=[DataRequired()])
    cargo_type_id = SelectField("Cargo type", coerce=int, validators=[DataRequired()])
    cargo_value = FloatField("Cargo value (₹)", validators=[Optional(), NumberRange(min=0)], default=0)
    status = SelectField("Status", choices=SHIPMENT_STATUSES, default="In-transit")
    assigned_operator_id = SelectField("Assigned operator", coerce=int)
    current_lat = FloatField("Current latitude", validators=[Optional(), NumberRange(min=-90, max=90)],
                             description="Leave blank to start at the origin hub.")
    current_lng = FloatField("Current longitude", validators=[Optional(), NumberRange(min=-180, max=180)])
    submit = SubmitField("Save shipment")

    def validate(self, extra_validators=None):
        ok = super().validate(extra_validators)
        if ok and self.origin.data == self.destination.data:
            self.destination.errors.append("Destination must differ from origin.")
            return False
        return ok


class StatusUpdateForm(FlaskForm):
    status = SelectField("Status", choices=SHIPMENT_STATUSES)
    submit = SubmitField("Update status")
