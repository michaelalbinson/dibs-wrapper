import * as React from 'react';
import { Typography, Card, CardContent, CardMedia, CardHeader, CardActions, Button, Grid } from '@material-ui/core';
import { RouteComponentProps, withRouter } from 'react-router';
import { Link } from 'react-router-dom'
import { StoreState } from '../types/store';
import { selectCurrentHour, selectRoomData, selectTimeCount } from '../store/selectors/rooms';
import { connect } from 'react-redux';
import { getPrettyHour, sanitiseTime } from '../lib/dateFuncs';
import postReq from '../client/postReq';
import SnackBar, { SnackBarVariant } from '../components/SnackBar';

interface ResponseObject {
  header: string
  bookMsg: string
  success: boolean,
  day: number,
  room: string,
  roomNum: string,
  free: any,
  pic: string,
  roomid: number,
  prettyDay: string,
  description: string,
  times: Array<number>
}

interface State {
  currentHour: number;
  response: Array<ResponseObject>;
  alert: any;
}

// @ts-ignore
interface Props extends RouteComponentProps<Props> {
  currentHour: number;
}

class Quick extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    const sanitisedHour = sanitiseTime(this.props.currentHour);

    this.state = {
      alert: null,
      currentHour: sanitisedHour,
      response: []
    };
  }

  componentDidMount() {
  }

  sendPostReq = async (hour) => {
    if (hour) {
      console.log('hour: ', hour);
      const serverResponse: ResponseObject = await postReq('/quicky', { time: hour }) as ResponseObject;
      console.log('serverResponse: ', serverResponse);

      if (serverResponse.success) {
        this.setState({
          response: this.state.response.concat(serverResponse)
        });
      } else {
        this.setState({
          alert: serverResponse
        });
      }
    }
  };

  renderAlert() {
    const { alert } = this.state;
    console.log('At renderAlert.  State: ', this.state);

    if (!alert)
      return (null);

    console.log('rendering alert!');
    return (
      <SnackBar type={SnackBarVariant.Error} className='quick__error-alert' message={alert.bookMsg} />
    );
  }

  renderCard(cardData, currentHour, isSuccess, gridWidth = { xs: 12, sm: 9 ,md: 6, lg: 4, xl: 3 }) {
    const cardHeaderText = isSuccess ? `Booked ${cardData.room} for ${cardData.times.map((time) => {
      return `${getPrettyHour(time)} - ${getPrettyHour(time + 1, true)}`;
    }).join(', ')}` : 'Quick Book';
    const cardImg = isSuccess ? cardData.pic : '/img/ilc-small.jpg';
    const cardDescription = isSuccess ? <Typography component="p">{cardData.description}</Typography> :
      <>
        <Typography component="p">
          QuickBook™ Automagically™ books the first available room for the coming hour. Already got a QuickBook™ room
          for this hour? Click again to Automagically™ get a booking for the next free hour!
        </Typography>
        <Typography component="p">
          Ready to get started? Click below!
        </Typography>
      </>;

    const bookNowTime = isSuccess ? currentHour + 1 : currentHour;

    return (
      <Grid item {...gridWidth}>
        <div className="quick">
          <Card className="quick__main-card">
            <CardMedia
              className="quick__main-card__img"
              image={cardImg}
              title={isSuccess ? cardData.room : 'ILC'}
            />
            <CardContent>
              <Typography gutterBottom variant="h5" component="h2">
                {cardHeaderText}
              </Typography>
              {cardDescription}
              <CardActions>
                <Button size="medium" color="primary" onClick={this.sendPostReq.bind(this, bookNowTime)}>
                  Book Now
                </Button>
                <Button size="medium" color="secondary" onClick={this.sendPostReq.bind(this, bookNowTime + 1)}>
                  Book for {getPrettyHour(bookNowTime + 1)} - {getPrettyHour(bookNowTime + 2, true)}
                </Button>
              </CardActions>
            </CardContent>
          </Card>

        </div>
      </Grid>
    );

  }

  renderInfo() {
    const { currentHour, response } = this.state;
    const isSuccess = response && response.length && response[response.length - 1].success;

    return (
      <div className="justify-content-center quick__card-container">
        <Grid container spacing={16} className="justify-content-center">
          {!response.length && this.renderCard([], currentHour, false, { xs: 12, sm: 10, md: 8, lg: 6, xl: 5 })}
          {response.map((bookingData) => {
            return this.renderCard(bookingData, currentHour, isSuccess);
          })}
        </Grid>
      </div>
    );
  }

  render() {
    return (
      <div className="content__wrapper">
        {this.renderAlert()}
        {this.renderInfo()}
      </div>
    );
  }
}

function mapStateToProps(state: StoreState) {
  return {
    roomData: selectRoomData(state),
    currentHour: selectCurrentHour(state),
    timeCount: selectTimeCount(state)
  };
}

export default connect(mapStateToProps)(Quick);
